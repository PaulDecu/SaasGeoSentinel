// src/subscriptions/subscription-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from '../tenants/entities/tenant.entity';
import { SubscriptionNotificationLog, NotificationType } from './entities/subscription-notification-log.entity';
import { MailService } from '../common/services/mail.service';
import {
  templateJMinus5,
  templateJMinus1,
  templateJ0,
  templateJPlus10,
  templateJPlus30,
} from './templates/subscription-emails.templates';

// ─── Tenant enrichi avec sa date de fin d'abonnement la plus tardive ──────────
interface TenantWithEndDate {
  id: string;
  companyName: string;
  contactEmail: string;
  subscriptionEnd: Date;
  daysOffset: number; // négatif = avant expiration, 0 = jour J, positif = après
}

@Injectable()
export class SubscriptionNotificationService {
  private readonly logger = new Logger(SubscriptionNotificationService.name);

  // Fuseaux horaires : on normalise tout en heure Paris pour le calcul des J-J
  private readonly TIMEZONE = 'Europe/Paris';

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,

    @InjectRepository(SubscriptionNotificationLog)
    private notifLogRepository: Repository<SubscriptionNotificationLog>,

    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // ─── Point d'entrée du Cron ──────────────────────────────────────────────────
  async processAll(): Promise<void> {
    const todayStr = this.getTodayInTimezone();
    this.logger.log(`🔔 Début du traitement des notifications — Aujourd'hui (Paris) : ${todayStr}`);

    const tenants = await this.getTenantsWithSubscriptionEnd();
    this.logger.log(`📋 ${tenants.length} tenant(s) à vérifier`);

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
      const notifType = this.resolveNotificationType(tenant.daysOffset);
      if (!notifType) {
        // Pas dans une fenêtre de notification (ex: J-3, J+7...)
        continue;
      }

      // ── Vérification déduplication ─────────────────────────────────────────
      const endDateStr = this.formatDate(tenant.subscriptionEnd);
      const alreadySent = await this.isAlreadySent(tenant.id, notifType, endDateStr);
      if (alreadySent) {
        this.logger.debug(
          `⏭️  [${tenant.companyName}] ${notifType} déjà envoyé pour le cycle se terminant le ${endDateStr}`
        );
        skipped++;
        continue;
      }

      // ── Envoi du mail ──────────────────────────────────────────────────────
      try {
        await this.sendNotification(tenant, notifType, endDateStr);
        await this.logNotification(tenant, notifType, endDateStr);
        this.logger.log(
          `✅ [${tenant.companyName}] Mail ${notifType} envoyé → ${tenant.contactEmail}`
        );
        sent++;
      } catch (error) {
        this.logger.error(
          `❌ [${tenant.companyName}] Échec mail ${notifType} : ${error.message}`,
          error.stack,
        );
        errors++;
      }
    }

    this.logger.log(
      `📊 Résumé : ${sent} envoyé(s) · ${skipped} déjà traité(s) · ${errors} erreur(s)`
    );
  }

  // ─── Récupère tous les tenants ayant un subscriptionEnd non null ─────────────
  private async getTenantsWithSubscriptionEnd(): Promise<TenantWithEndDate[]> {
    const tenants = await this.tenantRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.companyName',
        't.contactEmail',
        't.subscriptionEnd',
      ])
      .where('t.subscriptionEnd IS NOT NULL')
      .andWhere('t.contactEmail IS NOT NULL')
      .getMany();

    const todayMidnight = this.getTodayMidnightLocal();

    // Filtre défensif : exclut les null résiduels (champ nullable dans l'entité Tenant)
    return tenants
      .filter((t): t is typeof t & { subscriptionEnd: Date } => t.subscriptionEnd != null)
      .map((t) => {
        const endMidnight = this.toMidnightLocal(new Date(t.subscriptionEnd));
        const diffMs = endMidnight.getTime() - todayMidnight.getTime();
        const daysOffset = Math.round(diffMs / (1000 * 60 * 60 * 24));
        // daysOffset > 0 → pas encore expiré (ex: +5 = expire dans 5j)
        // daysOffset = 0 → expire aujourd'hui
        // daysOffset < 0 → déjà expiré (ex: -10 = expiré il y a 10j)

        return {
          id: t.id,
          companyName: t.companyName,
          contactEmail: t.contactEmail,
          subscriptionEnd: new Date(t.subscriptionEnd),
          daysOffset,
        };
      });
  }

  // ─── Mappe un offset en jours vers un type de notification ───────────────────
  private resolveNotificationType(daysOffset: number): NotificationType | null {
    if (daysOffset === 5)   return 'J-5';
    if (daysOffset === 1)   return 'J-1';
    if (daysOffset === 0)   return 'J0';
    if (daysOffset === -10) return 'J+10';
    if (daysOffset === -30) return 'J+30';
    return null;
  }

  // ─── Déduplication : unicité par (tenant, type, date_fin_cycle) ───────────────
  private async isAlreadySent(
    tenantId: string,
    notifType: NotificationType,
    endDateStr: string,
  ): Promise<boolean> {
    const existing = await this.notifLogRepository.findOne({
      where: { tenantId, notificationType: notifType, subscriptionEndDate: endDateStr },
    });
    return !!existing;
  }

  private async logNotification(
    tenant: TenantWithEndDate,
    notifType: NotificationType,
    endDateStr: string,
  ): Promise<void> {
    const log = this.notifLogRepository.create({
      tenantId: tenant.id,
      notificationType: notifType,
      subscriptionEndDate: endDateStr,
      emailSentTo: tenant.contactEmail,
    });
    await this.notifLogRepository.save(log);
  }

  // ─── Dispatch vers le bon template ───────────────────────────────────────────
  private async sendNotification(
    tenant: TenantWithEndDate,
    notifType: NotificationType,
    endDateStr: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://app.geosentinel.fr');
    const renewUrl = `${frontendUrl}/my-offer`;
    const endDateFr = this.formatDateFr(tenant.subscriptionEnd);

    let template: { subject: string; html: string };

    switch (notifType) {
      case 'J-5':
        template = templateJMinus5({
          companyName: tenant.companyName,
          adminEmail: tenant.contactEmail,
          endDate: endDateFr,
          daysRemaining: 5,
          renewUrl,
          frontendUrl,
        });
        break;

      case 'J-1':
        template = templateJMinus1({
          companyName: tenant.companyName,
          endDate: endDateFr,
          renewUrl,
          frontendUrl,
        });
        break;

      case 'J0':
        template = templateJ0({
          companyName: tenant.companyName,
          endDate: endDateFr,
          renewUrl,
          frontendUrl,
        });
        break;

      case 'J+10':
        template = templateJPlus10({
          companyName: tenant.companyName,
          endDate: endDateFr,
          renewUrl,
          frontendUrl,
        });
        break;

      case 'J+30': {
        // Date d'archivage = J+60 par rapport à la fin d'abonnement
        const archiveDate = new Date(tenant.subscriptionEnd);
        archiveDate.setDate(archiveDate.getDate() + 60);
        template = templateJPlus30({
          companyName: tenant.companyName,
          endDate: endDateFr,
          archiveDate: this.formatDateFr(archiveDate),
          renewUrl,
          frontendUrl,
        });
        break;
      }
    }

    await this.mailService.sendMail({
      to: tenant.contactEmail,
      subject: template.subject,
      html: template.html,
    });
  }

  // ─── Helpers date/timezone ────────────────────────────────────────────────────

  /**
   * Retourne la date d'aujourd'hui à minuit en heure locale Paris (UTC+1/+2).
   * On utilise Intl.DateTimeFormat pour extraire année/mois/jour dans le fuseau
   * cible, puis on reconstruit un Date en UTC afin que les diff soient exactes.
   */
  private getTodayMidnightLocal(): Date {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
    return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  }

  private toMidnightLocal(date: Date): Date {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
    return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  }

  private getTodayInTimezone(): string {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  /** Format YYYY-MM-DD pour la contrainte UNIQUE en BDD */
  private formatDate(date: Date): string {
    const d = this.toMidnightLocal(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Format lisible pour les mails (ex: "31 décembre 2025") */
  private formatDateFr(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
}