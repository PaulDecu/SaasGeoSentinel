import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Offer } from '../offers/entities/offer.entity';
import { CreateSubscriptionDto, RenewSubscriptionDto } from './dto/subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
  ) {}

  /**
   * Récupérer tous les abonnements d'un tenant
   */
  async findAllByTenant(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { tenantId },
      relations: ['offer'],
      order: { paymentDate: 'DESC' },
    });
  }

  /**
   * Récupérer un abonnement spécifique
   */
  async findOne(id: string, tenantId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, tenantId },
      relations: ['offer'],
    });

    if (!subscription) {
      throw new NotFoundException('Abonnement non trouvé');
    }

    return subscription;
  }

  /**
   * Récupérer l'abonnement actif d'un tenant
   */
  async findActiveSubscription(tenantId: string): Promise<Subscription | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.subscriptionRepository.findOne({
      where: {
        tenantId,
        subscriptionStartDate: LessThan(today),
        subscriptionEndDate: MoreThan(today),
      },
      relations: ['offer'],
      order: { subscriptionEndDate: 'DESC' },
    });
  }

  /**
   * Récupérer le dernier abonnement d'un tenant (actif ou expiré)
   */
  async findLatestSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { tenantId },
      relations: ['offer'],
      order: { subscriptionEndDate: 'DESC' },
    });
  }

  /**
   * Créer un nouvel abonnement manuellement (SuperAdmin uniquement)
   */
  async create(tenantId: string, createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    // Vérifier que le tenant existe
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant non trouvé');
    }

    // Vérifier que l'offre existe
    const offer = await this.offerRepository.findOne({ 
      where: { id: createSubscriptionDto.offerId } 
    });
    if (!offer) {
      throw new NotFoundException('Offre non trouvée');
    }

    // Créer l'abonnement
    const subscription = this.subscriptionRepository.create({
      tenantId,
      ...createSubscriptionDto,
      subscriptionStartDate: new Date(createSubscriptionDto.subscriptionStartDate),
      subscriptionEndDate: new Date(createSubscriptionDto.subscriptionEndDate),
      paymentDate: new Date(),
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Mettre à jour les dates d'abonnement du tenant
    await this.updateTenantSubscriptionDates(tenantId);

    return savedSubscription;
  }

  /**
   * Renouveler un abonnement (utilisé par les Admins de tenant)
   */
  async renew(tenantId: string, renewDto: RenewSubscriptionDto): Promise<Subscription> {
    // Vérifier que le tenant existe
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant non trouvé');
    }

    // Récupérer l'offre choisie
    const offer = await this.offerRepository.findOne({ 
      where: { id: renewDto.offerId } 
    });
    if (!offer) {
      throw new NotFoundException('Offre non trouvée');
    }

    // Vérifier que l'offre n'est pas en fin de commercialisation
    if (offer.endOfSale) {
      const endOfSaleDate = new Date(offer.endOfSale);
      const today = new Date();
      if (endOfSaleDate < today) {
        throw new BadRequestException('Cette offre n\'est plus disponible à la vente');
      }
    }

    // Récupérer le dernier abonnement pour calculer les dates
    const latestSubscription = await this.findLatestSubscription(tenantId);

    let startDate: Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (latestSubscription) {
      const lastEndDate = new Date(latestSubscription.subscriptionEndDate);
      lastEndDate.setHours(0, 0, 0, 0);

      // Si le dernier abonnement est déjà terminé, commencer aujourd'hui
      // Sinon, commencer le lendemain de la fin du dernier abonnement
      if (lastEndDate < today) {
        startDate = today;
      } else {
        startDate = new Date(lastEndDate);
        startDate.setDate(startDate.getDate() + 1);
      }
    } else {
      // Premier abonnement, commencer aujourd'hui
      startDate = today;
    }

    // Calculer la date de fin en utilisant la durée de l'offre
    const endDate = new Date(startDate);
    const subscriptionDays = offer.trialPeriodDays || 30; // Utiliser trialPeriodDays de l'offre
    endDate.setDate(endDate.getDate() + subscriptionDays);

    // Calculer le nombre de jours
    const daysSubscribed = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Créer le nouvel abonnement
    const subscription = this.subscriptionRepository.create({
      tenantId,
      offerId: offer.id,
      offerName: offer.name,
      paymentAmount: offer.price,
      paymentMethod: renewDto.paymentMethod,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      daysSubscribed,
      paymentDate: new Date(),
      metadata: renewDto.metadata || {},
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Mettre à jour les dates d'abonnement du tenant
    await this.updateTenantSubscriptionDates(tenantId);

    return savedSubscription;
  }

  /**
   * Mettre à jour les dates subscription_start et subscription_end du tenant
   * en fonction de ses abonnements actifs
   */
  private async updateTenantSubscriptionDates(tenantId: string): Promise<void> {
    // Récupérer tous les abonnements du tenant, triés par date
    const subscriptions = await this.subscriptionRepository.find({
      where: { tenantId },
      order: { subscriptionStartDate: 'ASC' },
    });

    if (subscriptions.length === 0) {
      return;
    }

    // La date de début = date de début du premier abonnement
    const subscriptionStart = subscriptions[0].subscriptionStartDate;

    // La date de fin = date de fin du dernier abonnement
    const subscriptionEnd = subscriptions[subscriptions.length - 1].subscriptionEndDate;

    // Mettre à jour le tenant
    await this.tenantRepository.update(tenantId, {
      subscriptionStart,
      subscriptionEnd,
    });
  }

  /**
   * Supprimer un abonnement (SuperAdmin uniquement)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const subscription = await this.findOne(id, tenantId);
    await this.subscriptionRepository.remove(subscription);

    // Recalculer les dates du tenant
    await this.updateTenantSubscriptionDates(tenantId);
  }

  /**
   * Récupérer les statistiques d'abonnements d'un tenant
   */
  async getStats(tenantId: string): Promise<any> {
    const subscriptions = await this.findAllByTenant(tenantId);
    
    const totalPaid = subscriptions.reduce((sum, sub) => sum + Number(sub.paymentAmount), 0);
    const totalDays = subscriptions.reduce((sum, sub) => sum + sub.daysSubscribed, 0);
    const activeSubscription = await this.findActiveSubscription(tenantId);

    return {
      totalSubscriptions: subscriptions.length,
      totalAmountPaid: totalPaid,
      totalDaysSubscribed: totalDays,
      hasActiveSubscription: !!activeSubscription,
      activeSubscription: activeSubscription || null,
    };
  }
}