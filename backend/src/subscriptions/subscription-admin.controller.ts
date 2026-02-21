// src/subscriptions/subscription-admin.controller.ts
// ─── Endpoint de déclenchement manuel (SUPERADMIN uniquement) ─────────────────
// Utile pour : tests en staging, rejeu manuel après incident, vérification QA.

import { Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SubscriptionCronService } from './subscription-cron.service';
import { SubscriptionNotificationService } from './subscription-notification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionNotificationLog } from './entities/subscription-notification-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user-role.enum';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SubscriptionAdminController {
  constructor(
    private readonly cronService: SubscriptionCronService,

    @InjectRepository(SubscriptionNotificationLog)
    private readonly notifLogRepository: Repository<SubscriptionNotificationLog>,
  ) {}

  /**
   * POST /admin/subscriptions/notifications/trigger
   * Déclenche manuellement le traitement complet des notifications.
   * Idempotent : la déduplication BDD empêche les doublons même si relancé.
   */
  @Post('notifications/trigger')
  async triggerNotifications(): Promise<{ message: string }> {
    return this.cronService.triggerManually();
  }

  /**
   * GET /admin/subscriptions/notifications/logs
   * Consulte l'historique des notifications envoyées (50 dernières).
   */
  @Get('notifications/logs')
  async getLogs(): Promise<SubscriptionNotificationLog[]> {
    return this.notifLogRepository.find({
      order: { sentAt: 'DESC' },
      take: 50,
      relations: ['tenant'],
    });
  }

  /**
   * GET /admin/subscriptions/notifications/stats
   * Résumé : combien de mails envoyés par type sur les 30 derniers jours.
   */
  @Get('notifications/stats')
  async getStats(): Promise<Record<string, number>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await this.notifLogRepository
      .createQueryBuilder('log')
      .select('log.notificationType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('log.sentAt >= :since', { since: thirtyDaysAgo })
      .groupBy('log.notificationType')
      .getRawMany();

    return logs.reduce(
      (acc, row) => ({ ...acc, [row.type]: Number(row.count) }),
      {} as Record<string, number>,
    );
  }
}
