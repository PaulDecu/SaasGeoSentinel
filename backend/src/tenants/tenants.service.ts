import { Injectable, NotFoundException, BadRequestException, ConflictException, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Offer } from '../offers/entities/offer.entity';
import { CreateTenantDto, UpdateTenantDto, CreateTenantAdminDto } from './dto/tenants.dto';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/entities/user-role.enum';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly auditService: AuditService,
    @InjectRepository(Subscription)  // 👈 NOUVEAU
    private subscriptionRepository: Repository<Subscription>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async create(createTenantDto: CreateTenantDto, createdBy: string): Promise<Tenant> {
    // Vérifier que l'offre existe
    const offer = await this.offerRepository.findOne({
      where: { id: createTenantDto.offerId },
    });

    if (!offer) {
      throw new NotFoundException(`Offre ${createTenantDto.offerId} introuvable`);
    }

    // Vérifier que l'offre est toujours en vente
    if (offer.endOfSale && new Date(offer.endOfSale) < new Date()) {
      throw new BadRequestException('Cette offre n\'est plus disponible à la vente');
    }

// ✅ CORRECTION : Calculer subscriptionEnd en utilisant trialPeriodDays de l'offre
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    const daysToAdd = offer.trialPeriodDays || 30;  // Utilise la durée de l'offre
    subscriptionEnd.setDate(subscriptionEnd.getDate() + daysToAdd);


    // Créer le tenant avec les dates d'abonnement
    const tenant = this.tenantRepository.create({
      companyName: createTenantDto.companyName,
      contactEmail: createTenantDto.contactEmail,
      contactPhone: createTenantDto.contactPhone,
      offerId: createTenantDto.offerId,
      addressLine1: createTenantDto.addressLine1,
      addressLine2: createTenantDto.addressLine2,
      postalCode: createTenantDto.postalCode,
      city: createTenantDto.city,
      country: createTenantDto.country,
      siren: createTenantDto.siren,
      subscriptionStart,
      subscriptionEnd,
      metadata: {}, // Initialiser metadata vide
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // Calculer le nombre de jours souscrits
    const daysSubscribed = Math.ceil(
      (subscriptionEnd.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24)
    );
     
    const subscription = this.subscriptionRepository.create({
      tenantId: savedTenant.id,
      offerId: offer.id,
      offerName: offer.name,
      paymentAmount: offer.price,
      paymentMethod: 'non_specifie', // Mode non spécifié pour création initiale
      paymentDate: new Date(),
      subscriptionStartDate: subscriptionStart,
      subscriptionEndDate: subscriptionEnd,
      daysSubscribed,
      metadata: {
        createdBy: 'superadmin',
        initialSubscription: true,
      },
    });

    await this.subscriptionRepository.save(subscription);

    // Log d'audit
    await this.auditService.log({
      action: 'TENANT_CREATED',
      userId: createdBy,
      tenantId: null,
      details: {
        tenantId: savedTenant.id,
        companyName: savedTenant.companyName,
        subscriptionStart: subscriptionStart.toISOString(),
        subscriptionEnd: subscriptionEnd.toISOString(),
      },
    });

    return this.findOne(savedTenant.id);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      relations: ['offer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['offer'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} introuvable`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto, updatedBy: string): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Si l'offre est modifiée, vérifier qu'elle existe
    if (updateTenantDto.offerId && updateTenantDto.offerId !== tenant.offerId) {
      const offer = await this.offerRepository.findOne({
        where: { id: updateTenantDto.offerId },
      });

      if (!offer) {
        throw new NotFoundException(`Offre ${updateTenantDto.offerId} introuvable`);
      }
    }

    // ✅ Gérer les dates d'abonnement
    if (updateTenantDto.subscriptionStart) {
      tenant.subscriptionStart = new Date(updateTenantDto.subscriptionStart);
    }

    if (updateTenantDto.subscriptionEnd) {
      tenant.subscriptionEnd = new Date(updateTenantDto.subscriptionEnd);
    }

    // Mettre à jour les autres champs
    if (updateTenantDto.companyName) tenant.companyName = updateTenantDto.companyName;
    if (updateTenantDto.contactEmail) tenant.contactEmail = updateTenantDto.contactEmail;
    if (updateTenantDto.contactPhone !== undefined) tenant.contactPhone = updateTenantDto.contactPhone;
    if (updateTenantDto.offerId) tenant.offerId = updateTenantDto.offerId;
    if (updateTenantDto.addressLine1 !== undefined) tenant.addressLine1 = updateTenantDto.addressLine1;
    if (updateTenantDto.addressLine2 !== undefined) tenant.addressLine2 = updateTenantDto.addressLine2;
    if (updateTenantDto.postalCode !== undefined) tenant.postalCode = updateTenantDto.postalCode;
    if (updateTenantDto.city !== undefined) tenant.city = updateTenantDto.city;
    if (updateTenantDto.country !== undefined) tenant.country = updateTenantDto.country;
    //if (updateTenantDto.siren !== undefined) tenant.siren = updateTenantDto.siren;
     
    if (updateTenantDto.siren !== undefined) {
      tenant.siren = updateTenantDto.siren || null; // ✅ chaîne vide → null
    }

    if (updateTenantDto.siren !== undefined) {
      const sirenValue = updateTenantDto.siren || null;
      // Validation du format (9 chiffres ou 14 chiffres)
      if (sirenValue !== null && !/^[0-9]{9}([0-9]{5})?$/.test(sirenValue)) {
          throw new Error("Format invalide : le numéro SIREN/SIRET doit comporter 9 ou 14 chiffres.");
      }
      tenant.siren = sirenValue; // ✅ chaîne vide ou null après validation
    }

    const updatedTenant = await this.tenantRepository.save(tenant);

    // Log d'audit
    await this.auditService.log({
      action: 'TENANT_UPDATED',
      userId: updatedBy,
      tenantId: id,
      details: {
        updates: updateTenantDto,
      },
    });

    return this.findOne(updatedTenant.id);
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const tenant = await this.findOne(id);

    // Vérifier qu'il n'y a pas d'utilisateurs actifs
    const userCount = await this.userRepository.count({
      where: { tenantId: id },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce tenant : ${userCount} utilisateur(s) actif(s)`,
      );
    }

    await this.tenantRepository.remove(tenant);

    // Log d'audit
    await this.auditService.log({
      action: 'TENANT_DELETED',
      userId: deletedBy,
      tenantId: null,
      details: {
        tenantId: id,
        companyName: tenant.companyName,
      },
    });
  }

  async checkUserLimit(tenantId: string): Promise<void> {
    const tenant = await this.findOne(tenantId);

    const currentUserCount = await this.userRepository.count({
      where: { tenantId },
    });

    if (currentUserCount >= tenant.offer.maxUsers) {
      throw new BadRequestException(
        `Limite d'utilisateurs atteinte (${tenant.offer.maxUsers} max)`,
      );
    }
  }

  async createAdmin(
    tenantId: string,
    createAdminDto: CreateTenantAdminDto,
    createdBy: string,
  ): Promise<User> {
    const tenant = await this.findOne(tenantId);

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await this.userRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // Vérifier la limite d'utilisateurs
    await this.checkUserLimit(tenantId);

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(createAdminDto.password, 10);

    // Créer l'admin
    const admin = this.userRepository.create({
      email: createAdminDto.email,
      passwordHash,
      role: UserRole.ADMIN,
      tenantId,
    });

    const savedAdmin = await this.userRepository.save(admin);
 // ✅ Envoyer le lien d'initialisation (valable 12h)
    await this.authService.sendInitializationEmail(savedAdmin.id);

    // Log d'audit
    await this.auditService.log({
      action: 'TENANT_ADMIN_CREATED',
      userId: createdBy,
      tenantId,
      details: {
        adminId: savedAdmin.id,
        adminEmail: savedAdmin.email,
      },
    });

    // Retourner sans le hash
    const { passwordHash: _, ...adminWithoutPassword } = savedAdmin;
    return adminWithoutPassword as User;
  }
}