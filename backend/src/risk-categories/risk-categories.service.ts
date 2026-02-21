import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantRiskCategory } from '../tenants/entities/tenant-risk-category.entity';
import { CreateRiskCategoryDto, UpdateRiskCategoryDto } from './dto/risk-categories.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { AuditService } from '../audit/audit.service';

// Catégories insérées automatiquement à la création d'un tenant
export const DEFAULT_RISK_CATEGORIES = [
  { name: 'naturel',       label: 'Naturel',       color: '#10B981', icon: '🌪️', position: 0 },
  { name: 'industriel',    label: 'Industriel',    color: '#F59E0B', icon: '🏭', position: 1 },
  { name: 'sanitaire',     label: 'Sanitaire',     color: '#EF4444', icon: '🏥', position: 2 },
  { name: 'technologique', label: 'Technologique', color: '#3B82F6', icon: '⚙️', position: 3 },
  { name: 'social',        label: 'Social',        color: '#8B5CF6', icon: '👥', position: 4 },
  { name: 'autre',         label: 'Autre',         color: '#6B7280', icon: '❓', position: 5 },
];

@Injectable()
export class RiskCategoriesService {
  constructor(
    @InjectRepository(TenantRiskCategory)
    private categoryRepository: Repository<TenantRiskCategory>,
    private auditService: AuditService,
  ) {}

  // ✅ Récupérer toutes les catégories d'un tenant (accessible à tous les rôles du tenant)
  async findAll(tenantId: string): Promise<TenantRiskCategory[]> {
    return this.categoryRepository.find({
      where: { tenantId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  // ✅ Créer une catégorie — ADMIN uniquement
  async create(dto: CreateRiskCategoryDto, user: User): Promise<TenantRiskCategory> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul un ADMIN peut créer des catégories');
    }
    if (!user.tenantId) throw new ForbiddenException('Tenant requis');

    // Vérifier unicité du name pour ce tenant
    const existing = await this.categoryRepository.findOne({
      where: { tenantId: user.tenantId!, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Une catégorie avec le nom "${dto.name}" existe déjà`);
    }

    const category = this.categoryRepository.create({
      tenantId: user.tenantId!,
      name: dto.name,
      label: dto.label,
      color: dto.color ?? '#6b7280',
      icon: dto.icon ?? null,
      position: dto.position ?? 0,
    });

    const saved = await this.categoryRepository.save(category);

    await this.auditService.log({
      action: 'RISK_CATEGORY_CREATED',
      userId: user.id,
      tenantId: user.tenantId!,
      details: { categoryId: saved.id, name: saved.name, label: saved.label },
    });

    return saved;
  }

  // ✅ Modifier une catégorie — ADMIN uniquement
  async update(id: string, dto: UpdateRiskCategoryDto, user: User): Promise<TenantRiskCategory> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul un ADMIN peut modifier des catégories');
    }

    const category = await this.findOneForTenant(id, user.tenantId!);

    if (dto.label !== undefined) category.label = dto.label;
    if (dto.color !== undefined) category.color = dto.color;
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.position !== undefined) category.position = dto.position;

    const saved = await this.categoryRepository.save(category);

    await this.auditService.log({
      action: 'RISK_CATEGORY_UPDATED',
      userId: user.id,
      tenantId: user.tenantId!,
      details: { categoryId: id, updates: dto },
    });

    return saved;
  }

  // ✅ Supprimer une catégorie — ADMIN uniquement, interdit si des risques l'utilisent
  async remove(id: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Seul un ADMIN peut supprimer des catégories');
    }

    const category = await this.findOneForTenant(id, user.tenantId!);

    // Vérifier qu'aucun risque n'utilise cette catégorie
    const risksUsingCategory = await this.categoryRepository.query(
      `SELECT COUNT(*) as count FROM risks WHERE category_id = $1`,
      [id],
    );
    const count = parseInt(risksUsingCategory[0].count, 10);
    if (count > 0) {
      throw new ConflictException(
        `Impossible de supprimer : ${count} risque(s) utilisent cette catégorie`,
      );
    }

    await this.categoryRepository.delete(id);

    await this.auditService.log({
      action: 'RISK_CATEGORY_DELETED',
      userId: user.id,
      tenantId: user.tenantId!,
      details: { categoryId: id, name: category.name },
    });
  }

  // ✅ Appelé lors de la création d'un tenant — insère les 6 catégories par défaut
  async createDefaultCategories(tenantId: string): Promise<void> {
    const categories = DEFAULT_RISK_CATEGORIES.map((cat) =>
      this.categoryRepository.create({ ...cat, tenantId }),
    );
    await this.categoryRepository.save(categories);
  }

  private async findOneForTenant(id: string, tenantId: string): Promise<TenantRiskCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie non trouvée');
    if (category.tenantId !== tenantId) throw new ForbiddenException('Accès interdit');
    return category;
  }
}