import { Request, Response } from 'express';
import { mollieClient } from './mollie.config';
import { PaymentStatus } from '@mollie/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatePaymentBody {
  offerId: string;
  paymentMethod: string;
  amount: number;         // en euros (ex: 29.99)
  description: string;
  subscriptionId?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCreatePaymentBody(body: unknown): body is CreatePaymentBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  if (typeof b.offerId !== 'string' || b.offerId.trim() === '') return false;
  if (typeof b.paymentMethod !== 'string' || b.paymentMethod.trim() === '') return false;
  if (typeof b.description !== 'string' || b.description.trim() === '') return false;

  const amount = Number(b.amount);
  if (isNaN(amount) || amount <= 0 || amount > 99999.99) return false;
  // Vérifie que le montant a au maximum 2 décimales
  if (!/^\d+(\.\d{1,2})?$/.test(String(amount))) return false;

  return true;
}

// ─── Mappage méthode de paiement → Mollie method ─────────────────────────────

const PAYMENT_METHOD_MAP: Record<string, string> = {
  carte_bancaire: 'creditcard',
  virement: 'banktransfer',
  prelevement: 'directdebit',
  cheque: 'banktransfer', // Mollie ne supporte pas les chèques, fallback virement
};

// ─── Simulateur de base de données ────────────────────────────────────────────
// Remplacez ces fonctions par vos vraies couches d'accès en base de données.

interface PaymentRecord {
  molliePaymentId: string;
  offerId: string;
  subscriptionId?: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'expired';
  amount: number;
  createdAt: Date;
}

// En production : remplacez par votre ORM / repository
const paymentRepository = {
  async save(record: PaymentRecord): Promise<void> {
    // ex: await db.payments.create({ data: record });
    console.log('[DB] Saving payment record:', record);
  },

  async findByMollieId(molliePaymentId: string): Promise<PaymentRecord | null> {
    // ex: return db.payments.findUnique({ where: { molliePaymentId } });
    console.log('[DB] Finding payment:', molliePaymentId);
    return null; // simulation — à remplacer
  },

  async updateStatus(
    molliePaymentId: string,
    status: PaymentRecord['status'],
  ): Promise<void> {
    // ex: await db.payments.update({ where: { molliePaymentId }, data: { status } });
    console.log('[DB] Updating payment status:', molliePaymentId, '->', status);
  },

  async activateSubscription(offerId: string, subscriptionId?: string): Promise<void> {
    // Logique métier : prolonger / créer l'abonnement lié à l'offre
    console.log('[DB] Activating subscription for offer:', offerId, 'subscription:', subscriptionId);
  },
};

// ─── Controller : Créer un paiement ───────────────────────────────────────────

export async function createPayment(req: Request, res: Response): Promise<void> {
  if (!validateCreatePaymentBody(req.body)) {
    res.status(400).json({
      error: 'Données invalides. Vérifiez offerId, paymentMethod, description et amount (> 0, max 2 décimales).',
    });
    return;
  }

  const { offerId, paymentMethod, amount, description, subscriptionId } = req.body;

  const mollieMethod = PAYMENT_METHOD_MAP[paymentMethod];
  if (!mollieMethod) {
    res.status(400).json({ error: `Mode de paiement non supporté : ${paymentMethod}` });
    return;
  }

  try {
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: amount.toFixed(2), // Mollie attend une string "29.99"
      },
      description,
      redirectUrl: `${baseUrl}/subscription/payment-result?offerId=${offerId}`,
      webhookUrl: `${baseUrl}/api/payments/webhook`,
      method: mollieMethod as any,
      metadata: {
        offerId,
        subscriptionId: subscriptionId ?? null,
      },
    });

    // Sauvegarde du paiement en base avec statut "pending"
    await paymentRepository.save({
      molliePaymentId: payment.id,
      offerId,
      subscriptionId,
      status: 'pending',
      amount,
      createdAt: new Date(),
    });

    res.status(201).json({
      paymentId: payment.id,
      checkoutUrl: payment.getCheckoutUrl(),
      status: payment.status,
    });
  } catch (error) {
    console.error('[Mollie] Erreur création paiement:', error);
    res.status(500).json({ error: 'Impossible de créer le paiement. Réessayez plus tard.' });
  }
}

// ─── Controller : Webhook sécurisé ────────────────────────────────────────────

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // Mollie envoie l'ID dans le body (x-www-form-urlencoded ou JSON selon la version)
  const molliePaymentId: unknown = req.body?.id;

  if (typeof molliePaymentId !== 'string' || molliePaymentId.trim() === '') {
    // Toujours répondre 200 à Mollie pour éviter les retries indéfinis
    res.status(200).send('OK');
    return;
  }

  try {
    // ✅ SÉCURITÉ : On ne fait JAMAIS confiance aux données du body.
    //    On interroge directement l'API Mollie pour obtenir le vrai statut.
    const payment = await mollieClient.payments.get(molliePaymentId);

    // ✅ IDEMPOTENCE : On vérifie si ce paiement a déjà été traité.
    const existingRecord = await paymentRepository.findByMollieId(molliePaymentId);

    if (existingRecord?.status === 'paid') {
      // Paiement déjà traité — on ignore silencieusement et on répond 200
      console.log(`[Webhook] Paiement ${molliePaymentId} déjà traité, ignoré.`);
      res.status(200).send('OK');
      return;
    }

    const offerId: string = payment.metadata?.offerId ?? '';
    const subscriptionId: string | undefined = payment.metadata?.subscriptionId ?? undefined;

    switch (payment.status) {
      case PaymentStatus.paid:
        // ✅ Mise à jour en base ET activation de l'abonnement
        await paymentRepository.updateStatus(molliePaymentId, 'paid');
        await paymentRepository.activateSubscription(offerId, subscriptionId);
        console.log(`[Webhook] Paiement ${molliePaymentId} confirmé — abonnement activé.`);
        break;

      case PaymentStatus.failed:
        await paymentRepository.updateStatus(molliePaymentId, 'failed');
        console.log(`[Webhook] Paiement ${molliePaymentId} échoué.`);
        break;

      case PaymentStatus.canceled:
        await paymentRepository.updateStatus(molliePaymentId, 'canceled');
        console.log(`[Webhook] Paiement ${molliePaymentId} annulé.`);
        break;

      case PaymentStatus.expired:
        await paymentRepository.updateStatus(molliePaymentId, 'expired');
        console.log(`[Webhook] Paiement ${molliePaymentId} expiré.`);
        break;

      default:
        // Statuts intermédiaires (open, pending…) — rien à faire
        console.log(`[Webhook] Paiement ${molliePaymentId} en cours (${payment.status}).`);
    }

    // Mollie attend impérativement un 200 pour ne pas relancer le webhook
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Erreur traitement:', error);
    // On répond 200 quand même pour éviter un storm de retries Mollie
    res.status(200).send('OK');
  }
}

// ─── Controller : Vérifier le statut d'un paiement (polling front-end) ────────

export async function getPaymentStatus(req: Request, res: Response): Promise<void> {
  const { paymentId } = req.params;

  if (!paymentId || typeof paymentId !== 'string') {
    res.status(400).json({ error: 'paymentId manquant' });
    return;
  }

  try {
    // On interroge Mollie directement pour avoir un statut temps réel
    const payment = await mollieClient.payments.get(paymentId);
    res.json({ status: payment.status, paymentId: payment.id });
  } catch (error) {
    console.error('[Mollie] Erreur récupération statut:', error);
    res.status(500).json({ error: 'Impossible de récupérer le statut du paiement.' });
  }
}
