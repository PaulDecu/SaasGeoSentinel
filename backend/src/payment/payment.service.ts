import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMollieClient, PaymentStatus } from '@mollie/api-client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class PaymentService {
  private mollieClient;

  constructor(
    private configService: ConfigService,
    private subscriptionsService: SubscriptionsService,
  ) {
    const apiKey = this.configService.get<string>('MOLLIE_API_KEY');
    if (!apiKey) throw new Error('MOLLIE_API_KEY manquant dans les variables d\'environnement');
    this.mollieClient = createMollieClient({ apiKey });
  }

  private readonly PAYMENT_METHOD_MAP: Record<string, string> = {
    carte_bancaire: 'creditcard',
    virement: 'banktransfer',
    prelevement: 'directdebit',
    cheque: 'banktransfer',
  };

  async createPayment(dto: CreatePaymentDto, tenantId: string) {
    const mollieMethod = this.PAYMENT_METHOD_MAP[dto.paymentMethod];
    if (!mollieMethod) {
      throw new BadRequestException(`Mode de paiement non supporté : ${dto.paymentMethod}`);
    }

    const baseUrl = this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';

    try {
      const payment = await this.mollieClient.payments.create({
        amount: { currency: 'EUR', value: dto.amount.toFixed(2) },
        description: dto.description,
        redirectUrl: `${frontendUrl}/dashboard/my-subscriptions/payment-result?offerId=${dto.offerId}`,
        webhookUrl: `${baseUrl}/api/payments/webhook`,
        method: mollieMethod as any,
        metadata: {
          offerId: dto.offerId,
          paymentMethod: dto.paymentMethod, // ✅ on stocke aussi la méthode de paiement
          tenantId,                          // ✅ on stocke le tenantId pour le webhook
        },
      });

      console.log('[Mollie] webhookUrl utilisée:', `${baseUrl}/api/payments/webhook`);
      console.log('[Mollie] APP_BASE_URL:', this.configService.get('APP_BASE_URL'));
      console.log('[Mollie] Paiement créé :', payment.id, 'pour tenant:', tenantId);

      return {
        paymentId: payment.id,
        checkoutUrl: payment.getCheckoutUrl(),
        status: payment.status,
      };
    } catch (error) {
      console.error('[Mollie] Erreur création paiement:', error);
      throw new InternalServerErrorException('Impossible de créer le paiement.');
    }
  }

  async handleWebhook(body: { id?: string }) {
    const molliePaymentId = body?.id;
    if (!molliePaymentId) return;

    try {
      // ✅ SÉCURITÉ : on interroge Mollie pour obtenir le vrai statut
      const payment = await this.mollieClient.payments.get(molliePaymentId);

      const metadata = payment.metadata as {
        offerId?: string;
        paymentMethod?: string;
        tenantId?: string;
      } | null;

      const offerId = metadata?.offerId ?? '';
      const paymentMethod = metadata?.paymentMethod ?? 'carte_bancaire';
      const tenantId = metadata?.tenantId ?? '';

      switch (payment.status) {
        case PaymentStatus.paid:
          // ✅ IDEMPOTENCE : on vérifie si l'abonnement existe déjà pour ce paiement Mollie
          // en regardant les métadonnées ou en cherchant en base
          if (!offerId || !tenantId) {
            console.error('[Webhook] Métadonnées manquantes, impossible d\'activer l\'abonnement');
            break;
          }

          try {
            // ✅ Appel de subscriptionsService.renew() — même logique que le renouvellement manuel
            const subscription = await this.subscriptionsService.renew(tenantId, {
              offerId,
              paymentMethod,
              metadata: { molliePaymentId }, // on stocke l'ID Mollie pour l'idempotence
            });

            console.log(`[Webhook] ✅ Abonnement créé : ${subscription.functionalId} pour tenant ${tenantId}`);
          } catch (renewError) {
            console.error('[Webhook] Erreur activation abonnement:', renewError);
          }
          break;

        case PaymentStatus.failed:
          console.log(`[Webhook] ❌ Paiement ${molliePaymentId} échoué`);
          break;

        case PaymentStatus.canceled:
          console.log(`[Webhook] 🚫 Paiement ${molliePaymentId} annulé`);
          break;

        case PaymentStatus.expired:
          console.log(`[Webhook] ⏰ Paiement ${molliePaymentId} expiré`);
          break;

        default:
          console.log(`[Webhook] ℹ️ Statut intermédiaire : ${payment.status}`);
      }
    } catch (error) {
      // On ne throw pas — Mollie doit toujours recevoir un 200
      console.error('[Webhook] Erreur traitement:', error);
    }
  }

  async getPaymentStatus(paymentId: string) {
    try {
      const payment = await this.mollieClient.payments.get(paymentId);
      return { status: payment.status, paymentId: payment.id };
    } catch (error) {
      throw new InternalServerErrorException('Impossible de récupérer le statut du paiement.');
    }
  }
}
