// src/subscriptions/subscriptions.module.ts
// ─── Module complet incluant le Cron et les notifications ─────────────────────

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

import { Subscription } from './entities/subscription.entity';
import { SubscriptionNotificationLog } from './entities/subscription-notification-log.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Offer } from '../offers/entities/offer.entity';

import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionNotificationService } from './subscription-notification.service';
import { SubscriptionCronService } from './subscription-cron.service';

import { MailService } from '../common/services/mail.service';

import { SubscriptionAdminController } from './subscription-admin.controller';



@Module({
  imports: [
    // ScheduleModule.forRoot() doit aussi être appelé dans AppModule.
    // On l'importe ici pour la lisibilité mais NestJS déduplique automatiquement.
    ScheduleModule.forRoot(),
    ConfigModule,
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionNotificationLog,
      Tenant,
      Offer,
    ]),
  ],
  controllers: [SubscriptionsController, SubscriptionAdminController],
  providers: [
    SubscriptionsService,
    SubscriptionNotificationService,
    SubscriptionCronService,
    MailService,
  ],
  exports: [SubscriptionsService, SubscriptionNotificationService],
})
export class SubscriptionsModule {}