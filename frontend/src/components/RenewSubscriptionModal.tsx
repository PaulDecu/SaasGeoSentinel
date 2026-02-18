'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Spinner } from '@/components/ui';
import { Offer } from '@/types';
import { offersApi, paymentsApi } from '@/lib/api/resources';
import toast from 'react-hot-toast';

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * onRenew n'est plus appelé directement — la validation du renouvellement
   * est désormais déclenchée par le webhook Mollie côté serveur.
   * Cette prop reste pour d'éventuels callbacks UI (ex: rafraîchir la page).
   */
  onRenewSuccess?: () => void;
  currentOfferId?: string;
  subscriptionEndDate?: string;
  subscriptionId?: string;
}

// ─── Statuts possibles du tunnel de paiement ─────────────────────────────────
type PaymentStep = 'form' | 'redirecting' | 'polling' | 'success' | 'error';

export function RenewSubscriptionModal({
  isOpen,
  onClose,
  onRenewSuccess,
  currentOfferId,
  subscriptionEndDate,
  subscriptionId,
}: RenewSubscriptionModalProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadOffers();
      setPaymentStep('form');
      if (currentOfferId) setSelectedOfferId(currentOfferId);
    }
  }, [isOpen, currentOfferId]);

  // ─── Polling du statut après retour depuis Mollie ────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('paymentId');
    const fromMollie = params.get('offerId');

    if (isOpen && paymentId && fromMollie) {
      setPaymentStep('polling');
      pollPaymentStatus(paymentId);
    }
  }, [isOpen]);

  const pollPaymentStatus = async (paymentId: string, attempts = 0): Promise<void> => {
    if (attempts >= 10) {
      setPaymentStep('error');
      setErrorMessage('Le statut du paiement n a pas pu être confirmé. Vérifiez vos abonnements.');
      return;
    }

    try {
      const data = await paymentsApi.getStatus(paymentId);

      if (data.status === 'paid') {
        setPaymentStep('success');
        toast.success('Abonnement renouvelé avec succès !');
        onRenewSuccess?.();
        return;
      }

      if (['failed', 'canceled', 'expired'].includes(data.status)) {
        setPaymentStep('error');
        setErrorMessage('Le paiement a échoué ou a été annulé. Veuillez réessayer.');
        return;
      }

      // Statut intermédiaire → on réessaie dans 2 secondes
      setTimeout(() => pollPaymentStatus(paymentId, attempts + 1), 2000);
    } catch {
      setTimeout(() => pollPaymentStatus(paymentId, attempts + 1), 2000);
    }
  };

  const loadOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const allOffers = await offersApi.getAvailable();
      const today = new Date();
      const availableOffers = allOffers.filter((offer) => {
        if (offer.endOfSale && new Date(offer.endOfSale) < today) return false;
        const name = offer.name.toLowerCase();
        return !['gratuit', 'essai', 'bienvenue', 'test', 'démo'].some((kw) =>
          name.includes(kw),
        );
      });
      setOffers(availableOffers);
    } catch {
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const calculateDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date;
    if (subscriptionEndDate) {
      const endDate = new Date(subscriptionEndDate);
      endDate.setHours(0, 0, 0, 0);
      startDate = endDate < today ? today : new Date(endDate.setDate(endDate.getDate() + 1));
    } else {
      startDate = today;
    }

    const selectedOffer = offers.find((o) => o.id === selectedOfferId);
    const subscriptionDays = selectedOffer?.trialPeriodDays ?? 30;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + subscriptionDays);

    return { startDate, endDate, daysSubscribed: subscriptionDays };
  };

  // ─── Soumission : on crée le paiement et on redirige vers Mollie ─────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOfferId) {
      toast.error('Veuillez sélectionner une offre');
      return;
    }
    if (!paymentMethod) {
      toast.error('Veuillez sélectionner un mode de paiement');
      return;
    }

    const selectedOffer = offers.find((o) => o.id === selectedOfferId);
    if (!selectedOffer) {
      toast.error('Offre introuvable, veuillez recharger la page.');
      return;
    }

    setIsLoading(true);
    setPaymentStep('redirecting');

    try {
      const { checkoutUrl, paymentId  } = await paymentsApi.create({
        offerId: selectedOfferId,
        paymentMethod,
        amount: Number(selectedOffer.price),
        description: `Renouvellement abonnement — ${selectedOffer.name}`,
        subscriptionId,
      });
      sessionStorage.setItem('pendingPaymentId', paymentId);
      // Redirection vers la page de paiement sécurisée Mollie
      window.location.href = checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(message);
      setPaymentStep('form');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedOffer = offers.find((o) => o.id === selectedOfferId);
  const { startDate, endDate, daysSubscribed } = calculateDates();

  // ─── États intermédiaires du tunnel de paiement ──────────────────────────

  if (paymentStep === 'redirecting') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm text-center py-12">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">Redirection vers le paiement sécurisé…</p>
          <p className="text-xs text-slate-500 mt-2">Vous allez être redirigé vers Mollie.</p>
        </Card>
      </div>
    );
  }

  if (paymentStep === 'polling') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm text-center py-12">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">Vérification du paiement en cours…</p>
          <p className="text-xs text-slate-500 mt-2">Merci de patienter quelques instants.</p>
        </Card>
      </div>
    );
  }

  if (paymentStep === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-slate-900 font-bold text-xl mb-2">Abonnement renouvelé !</p>
          <p className="text-sm text-slate-600 mb-6">Votre paiement a bien été confirmé.</p>
          <Button onClick={onClose} className="btn-neon w-full">Fermer</Button>
        </Card>
      </div>
    );
  }

  if (paymentStep === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-sm text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-slate-900 font-bold text-xl mb-2">Paiement non confirmé</p>
          <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>
          <div className="flex gap-3">
            <Button onClick={onClose} className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300">Fermer</Button>
            <Button onClick={() => setPaymentStep('form')} className="flex-1 btn-neon">Réessayer</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Formulaire principal ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">🔄 Renouveler mon abonnement</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl" disabled={isLoading}>×</button>
        </div>

        {isLoadingOffers ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-slate-600 mb-2 font-semibold">Aucune offre disponible</p>
            <p className="text-sm text-slate-500">Il n'y a actuellement aucune offre payante disponible.</p>
            <Button onClick={onClose} className="mt-4 bg-slate-200 text-slate-700 hover:bg-slate-300">Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection de l'offre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Offre à souscrire *</label>
              <select
                value={selectedOfferId}
                onChange={(e) => setSelectedOfferId(e.target.value)}
                className="input-tech w-full"
                required
                disabled={isLoading}
              >
                <option value="">Sélectionner une offre</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name} — {Number(offer.price).toFixed(2)} €/mois ({offer.maxUsers} utilisateurs)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">💡 Seules les offres payantes sont disponibles</p>
            </div>

            {/* Mode de paiement */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mode de paiement *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-tech w-full"
                required
                disabled={isLoading}
              >
                <option value="">Sélectionner un mode de paiement</option>
                <option value="carte_bancaire" selected >Carte bancaire</option>

              </select>
            </div>

            {/* Récapitulatif */}
            {selectedOffer && (
              <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-primary-900 flex items-center gap-2"><span>📋</span> Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Offre sélectionnée :</span>
                    <span className="font-bold text-slate-900">{selectedOffer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date de début :</span>
                    <span className="font-bold text-success-600">{startDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date de fin :</span>
                    <span className="font-bold text-success-600">{endDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Durée :</span>
                    <span className="font-bold text-slate-900">{daysSubscribed} jours</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-primary-300">
                    <span className="text-slate-600">Montant à payer :</span>
                    <span className="font-black text-primary-600 text-lg">{Number(selectedOffer.price).toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}

            {/* Informations importantes */}
            <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-4">
              <h3 className="font-bold text-accent-900 mb-2 flex items-center gap-2"><span>💡</span> Informations importantes</h3>
              <ul className="space-y-1 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Vous serez redirigé vers la page de paiement sécurisée Mollie.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Votre abonnement sera activé <strong>uniquement après confirmation du paiement</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Votre nouvel abonnement commencera le {startDate.toLocaleDateString('fr-FR')}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Vous pourrez générer votre facture depuis la page « Mes Abonnements ».</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button type="button" onClick={onClose} className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300" disabled={isLoading}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1 btn-neon" disabled={isLoading || !selectedOfferId || !paymentMethod}>
                {isLoading ? (
                  <><Spinner size="sm" className="mr-2" />Traitement...</>
                ) : (
                  <>🔒 Payer maintenant — {selectedOffer ? `${Number(selectedOffer.price).toFixed(2)} €` : '—'}</>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}