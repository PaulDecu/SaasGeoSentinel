import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Risk } from './entities/risk.entity';
import { CreateRiskDto, UpdateRiskDto, FindNearbyRisksDto } from './dto/risks.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RisksService {
  constructor(
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
    private auditService: AuditService,
  ) {}

  async create(createRiskDto: CreateRiskDto, user: User): Promise<Risk> {
    const { latitude, longitude, ...riskData } = createRiskDto;

    // Vérifier que l'utilisateur a un tenant (sauf superadmin)
    if (user.role !== UserRole.SUPERADMIN && !user.tenantId) {
      throw new ForbiddenException('Utilisateur sans tenant');
    }

    const tenantId = user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant requis');
    }

    // Créer le risque avec PostGIS
    const result = await this.riskRepository.query(
      `INSERT INTO risks (
        id, tenant_id, created_by, title, description, category, severity, location, metadata
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, 
        ST_SetSRID(ST_MakePoint($7, $8), 4326)::GEOGRAPHY, $9
      ) RETURNING id`,
      [
        tenantId,
        user.id,
        riskData.title,
        riskData.description || null,
        riskData.category,
        riskData.severity,
        longitude, // PostGIS: longitude en premier
        latitude,
        JSON.stringify(riskData.metadata || {}),
      ],
    );

    const riskId = result[0].id;

    // Audit log
    await this.auditService.log({
      action: 'RISK_CREATED',
      userId: user.id,
      tenantId: tenantId,
      details: {
        riskId,
        title: riskData.title,
        category: riskData.category,
        severity: riskData.severity,
      },
    });

    return this.findOne(riskId, user);
  }

  async findAll(user: User): Promise<Risk[]> {
    if (user.role === UserRole.SUPERADMIN) {
      // Superadmin voit tous les risques
      return this.getAllRisksWithCoordinates();
    }

    if (!user.tenantId) {
      return [];
    }

    // Autres rôles: uniquement les risques du tenant
    return this.getRisksByTenant(user.tenantId);
  }

  async findOne(id: string, user: User): Promise<Risk> {
    const risks = await this.riskRepository.query(
      `SELECT 
        r.*,
        u.email AS creator_email,
        ST_Y(r.location::geometry) AS latitude,
        ST_X(r.location::geometry) AS longitude
      FROM risks r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1`,
      [id],
    );

    if (risks.length === 0) {
      throw new NotFoundException('Risque non trouvé');
    }

    const risk = risks[0];

    // Vérifier les permissions
    if (user.role !== UserRole.SUPERADMIN && risk.tenant_id !== user.tenantId) {
      throw new ForbiddenException('Accès interdit à ce risque');
    }

    // Si utilisateur simple, vérifier qu'il est le créateur
    if (user.role === UserRole.UTILISATEUR && risk.created_by !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres risques');
    }

    return this.mapRiskFromQuery(risk);
  }

  async update(id: string, updateRiskDto: UpdateRiskDto, user: User): Promise<Risk> {
    const risk = await this.findOne(id, user);

    // Vérifier permissions de modification
    if (user.role === UserRole.UTILISATEUR && risk.createdByUserId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres risques');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateRiskDto.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(updateRiskDto.title);
    }

    if (updateRiskDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateRiskDto.description);
    }

    if (updateRiskDto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(updateRiskDto.category);
    }

    if (updateRiskDto.severity !== undefined) {
      updates.push(`severity = $${paramIndex++}`);
      values.push(updateRiskDto.severity);
    }

    if (updateRiskDto.latitude !== undefined && updateRiskDto.longitude !== undefined) {
      updates.push(`location = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)::GEOGRAPHY`);
      values.push(updateRiskDto.longitude, updateRiskDto.latitude);
    }

    if (updateRiskDto.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updateRiskDto.metadata));
    }

    if (updates.length === 0) {
      return risk;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.riskRepository.query(
      `UPDATE risks SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );

    // Audit log
    await this.auditService.log({
      action: 'RISK_UPDATED',
      userId: user.id,
      tenantId: user.tenantId,
      details: {
        riskId: id,
        updates: updateRiskDto,
      },
    });

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const risk = await this.findOne(id, user);

    // Vérifier permissions de suppression
    if (user.role === UserRole.UTILISATEUR && risk.createdByUserId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres risques');
    }

    await this.riskRepository.delete(id);

    // Audit log
    await this.auditService.log({
      action: 'RISK_DELETED',
      userId: user.id,
      tenantId: user.tenantId,
      details: {
        riskId: id,
        title: risk.title,
      },
    });
  }

  // ✅ NOUVEAU: Suppression en masse
  async bulkDelete(ids: string[], user: User): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.remove(id, user);
        success.push(id);
      } catch (error) {
        console.error(`Échec suppression risque ${id}:`, error.message);
        failed.push(id);
      }
    }

    // Audit log
    await this.auditService.log({
      action: 'RISK_BULK_DELETE',
      userId: user.id,
      tenantId: user.tenantId,
      details: {
        total: ids.length,
        success: success.length,
        failed: failed.length,
        successIds: success,
        failedIds: failed,
      },
    });

    return { success, failed };
  }

  async findNearby(query: FindNearbyRisksDto, user: User): Promise<Risk[]> {
    const { lat, lng, radius_km = 10, limit = 200 } = query;
    const radiusMeters = radius_km * 1000;

    if (user.role === UserRole.SUPERADMIN) {
      // Superadmin: tous les risques à proximité
      return this.getNearbyRisks(lat, lng, radiusMeters, limit);
    }

    if (!user.tenantId) {
      return [];
    }

    // Autres rôles: uniquement les risques du tenant
    return this.getNearbyRisksByTenant(lat, lng, radiusMeters, limit, user.tenantId);
  }

  private async getNearbyRisksByTenant(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number,
    tenantId: string,
  ): Promise<Risk[]> {
    const risks = await this.riskRepository.query(
      `SELECT 
        r.*,
        u.email AS creator_email,
        ST_Y(r.location::geometry) AS latitude,
        ST_X(r.location::geometry) AS longitude,
        ST_Distance(
          r.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
        ) AS distance
      FROM risks r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.tenant_id = $3
        AND ST_DWithin(
          r.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
          $4
        )
      ORDER BY distance ASC
      LIMIT $5`,
      [lng, lat, tenantId, radiusMeters, limit],
    );

    return risks.map((r: any) => this.mapRiskFromQuery(r));
  }

  private async getNearbyRisks(
    lat: number,
    lng: number,
    radiusMeters: number,
    limit: number,
  ): Promise<Risk[]> {
    const risks = await this.riskRepository.query(
      `SELECT 
        r.*,
        u.email AS creator_email,
        ST_Y(r.location::geometry) AS latitude,
        ST_X(r.location::geometry) AS longitude,
        ST_Distance(
          r.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
        ) AS distance
      FROM risks r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE ST_DWithin(
        r.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
        $3
      )
      ORDER BY distance ASC
      LIMIT $4`,
      [lng, lat, radiusMeters, limit],
    );

    return risks.map((r: any) => this.mapRiskFromQuery(r));
  }

  private async getRisksByTenant(tenantId: string): Promise<Risk[]> {
    const risks = await this.riskRepository.query(
      `SELECT 
        r.*,
        u.email AS creator_email,
        ST_Y(r.location::geometry) AS latitude,
        ST_X(r.location::geometry) AS longitude
      FROM risks r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC`,
      [tenantId],
    );

    return risks.map((r: any) => this.mapRiskFromQuery(r));
  }

  private async getAllRisksWithCoordinates(): Promise<Risk[]> {
    const risks = await this.riskRepository.query(
      `SELECT 
        r.*,
        u.email AS creator_email,
        ST_Y(r.location::geometry) AS latitude,
        ST_X(r.location::geometry) AS longitude
      FROM risks r
      LEFT JOIN users u ON r.created_by = u.id
      ORDER BY r.created_at DESC`,
    );

    return risks.map((r: any) => this.mapRiskFromQuery(r));
  }

  private mapRiskFromQuery(row: any): Risk {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      createdByUserId: row.created_by,
      creatorEmail: row.creator_email,
      title: row.title,
      description: row.description,
      category: row.category,
      severity: row.severity,
      location: row.location,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      distance: row.distance ? parseFloat(row.distance) : undefined,
    } as Risk;
  }

  // Pour ETag support
  async generateETag(risks: Risk[]): Promise<string> {
    const content = JSON.stringify(risks);
    const { createHash } = require('crypto');
    return createHash('md5').update(content).digest('hex');
  }
}
