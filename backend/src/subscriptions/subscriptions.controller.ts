import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, RenewSubscriptionDto } from './dto/subscriptions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * GET /subscriptions
   * Récupérer tous les abonnements du tenant de l'utilisateur connecté
   * Accessible par : ADMIN (de son propre tenant) et SUPERADMIN (tous les tenants)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    
    // Les ADMIN ne peuvent voir que leurs propres abonnements
    if (user.role === UserRole.ADMIN) {
      if (!user.tenantId) {
        throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
      }
      return this.subscriptionsService.findAllByTenant(user.tenantId);
    }
    
    // Les SUPERADMIN peuvent voir tous les abonnements (à implémenter si besoin)
    throw new ForbiddenException('Action non autorisée');
  }

  /**
   * GET /subscriptions/my-tenant
   * Récupérer tous les abonnements de mon tenant (pour l'ADMIN)
   */
  @Get('my-tenant')
  @Roles(UserRole.ADMIN)
  async findMyTenantSubscriptions(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
    }
    
    return this.subscriptionsService.findAllByTenant(user.tenantId);
  }

  /**
   * GET /subscriptions/stats
   * Récupérer les statistiques d'abonnements du tenant
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
    }
    
    return this.subscriptionsService.getStats(user.tenantId);
  }

  /**
   * GET /subscriptions/active
   * Récupérer l'abonnement actif du tenant
   */
  @Get('active')
  @Roles(UserRole.ADMIN)
  async findActive(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
    }
    
    return this.subscriptionsService.findActiveSubscription(user.tenantId);
  }

  /**
   * POST /subscriptions/renew
   * Renouveler l'abonnement (pour les ADMIN de tenant)
   */
  @Post('renew')
  @Roles(UserRole.ADMIN)
  async renew(@Request() req: ExpressRequest & { user: any }, @Body() renewDto: RenewSubscriptionDto) {
    const user = req.user;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
    }
    
    return this.subscriptionsService.renew(user.tenantId, renewDto);
  }

  /**
   * POST /subscriptions/tenant/:tenantId
   * Créer un abonnement manuellement (SUPERADMIN uniquement)
   */
  @Post('tenant/:tenantId')
  @Roles(UserRole.SUPERADMIN)
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(tenantId, createDto);
  }

  /**
   * GET /subscriptions/by-tenant/:tenantId
   * Récupérer tous les abonnements d'un tenant spécifique (SUPERADMIN uniquement)
   */
  @Get('by-tenant/:tenantId')
  @Roles(UserRole.SUPERADMIN)
  async findByTenant(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.findAllByTenant(tenantId);
  }

  /**
   * GET /subscriptions/:id
   * Récupérer un abonnement spécifique
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Request() req: ExpressRequest & { user: any }, @Param('id') id: string) {
    const user = req.user;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Aucun tenant associé à cet utilisateur');
    }
    
    return this.subscriptionsService.findOne(id, user.tenantId);
  }

  /**
   * DELETE /subscriptions/:id
   * Supprimer un abonnement (SUPERADMIN uniquement)
   */
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  async remove(@Param('id') id: string, @Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    // Pour SuperAdmin, on peut permettre de supprimer n'importe quel abonnement
    // On récupère le tenantId depuis l'abonnement lui-même
    const subscription = await this.subscriptionsService.findOne(id, user.tenantId || '');
    return this.subscriptionsService.remove(id, subscription.tenantId);
  }
}