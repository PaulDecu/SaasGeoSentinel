// src/subscriptions/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionNotificationService } from './subscription-notification.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly notificationService: SubscriptionNotificationService,
  ) {}

  /**
   * Cron quotidien à 07h00 heure Paris.
   *
   * Pourquoi 07h00 ?
   * — Permet aux admins de recevoir le mail en début de journée
   *   avant que leurs équipes terrain ne démarrent leurs tournées.
   * — Assez tôt pour que les J-1 soient actionnables dans la journée.
   * — En UTC : 06h00 hiver (UTC+1), 05h00 été (UTC+2).
   *   On utilise un cron en heure locale via la timezone NestJS Schedule.
   *
   * Format : seconde minute heure jour mois jour_semaine
   */
  @Cron('0 0 7 * * *', {
    name: 'subscription-lifecycle-notifications',
    timeZone: 'Europe/Paris',
  })
  async handleSubscriptionLifecycle(): Promise<void> {
    this.logger.log('⏰ Cron subscription-lifecycle déclenché');

    try {
      await this.notificationService.processAll();
    } catch (error) {
      // On catch ici pour ne jamais laisser le scheduler crasher silencieusement
      this.logger.error(
        `💥 Erreur critique dans le cron subscription-lifecycle : ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Méthode utilitaire : permet de déclencher le traitement manuellement
   * depuis un endpoint d'administration ou un test d'intégration.
   * À protéger par un guard SUPERADMIN si exposée via HTTP.
   */
  async triggerManually(): Promise<{ message: string }> {
    this.logger.warn('🔧 Déclenchement manuel du cron subscription-lifecycle');
    await this.notificationService.processAll();
    return { message: 'Traitement des notifications effectué' };
  }
}
