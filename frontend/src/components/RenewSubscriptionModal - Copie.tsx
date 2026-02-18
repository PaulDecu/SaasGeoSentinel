'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Spinner } from '@/components/ui';
import { Offer } from '@/types';
import { offersApi } from '@/lib/api/resources';
import toast from 'react-hot-toast';

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenew: (offerId: string, paymentMethod: string) => Promise<void>;
  currentOfferId?: string;
  subscriptionEndDate?: string;
}

export function RenewSubscriptionModal({
  isOpen,
  onClose,
  onRenew,
  currentOfferId,
  subscriptionEndDate,
}: RenewSubscriptionModalProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>(''); // Vide par défaut au lieu de 'non_specifie'
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadOffers();
      if (currentOfferId) {
        setSelectedOfferId(currentOfferId);
      }
    }
  }, [isOpen, currentOfferId]);

  const loadOffers = async () => {
    setIsLoadingOffers(true);
    try {
      // Utiliser getAvailable() au lieu de getAll() pour éviter l'erreur 403
      const allOffers = await offersApi.getAvailable();
      
      // Filtrer les offres disponibles (pas expirées)
      const today = new Date();
      const availableOffers = allOffers.filter(offer => {
        if (offer.endOfSale && new Date(offer.endOfSale) < today) {
          return false;
        }
        
        // 🆕 Exclure les offres contenant "gratuit", "essai" ou "bienvenue"
        const offerNameLower = offer.name.toLowerCase();
        const excludedKeywords = ['gratuit', 'essai', 'bienvenue', 'test', 'démo'];
        const hasExcludedKeyword = excludedKeywords.some(keyword => 
          offerNameLower.includes(keyword)
        );
        
        return !hasExcludedKeyword;
      });

      setOffers(availableOffers);
    } catch (error) {
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

      // Si l'abonnement est déjà terminé, commencer aujourd'hui
      if (endDate < today) {
        startDate = today;
      } else {
        // Sinon, commencer le lendemain de la fin de l'abonnement actuel
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() + 1);
      }
    } else {
      startDate = today;
    }

    // Utiliser la durée de l'offre sélectionnée
    const selectedOffer = offers.find(o => o.id === selectedOfferId);
    const subscriptionDays = selectedOffer?.trialPeriodDays || 30;

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + subscriptionDays);

    const daysSubscribed = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { startDate, endDate, daysSubscribed };
  };

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

    setIsLoading(true);
    try {
      await onRenew(selectedOfferId, paymentMethod);
      onClose();
    } catch (error) {
      // L'erreur est gérée par le parent
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedOffer = offers.find(o => o.id === selectedOfferId);
  const { startDate, endDate, daysSubscribed } = calculateDates();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            🔄 Renouveler mon abonnement
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {isLoadingOffers ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-slate-600 mb-2 font-semibold">Aucune offre disponible</p>
            <p className="text-sm text-slate-500">
              Il n'y a actuellement aucune offre payante disponible pour le renouvellement.
            </p>
            <Button
              onClick={onClose}
              className="mt-4 bg-slate-200 text-slate-700 hover:bg-slate-300"
            >
              Fermer
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection de l'offre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Offre à souscrire *
              </label>
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
                    {offer.name} - {Number(offer.price).toFixed(2)}€/mois ({offer.maxUsers} utilisateurs)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                💡 Seules les offres payantes sont disponibles pour le renouvellement
              </p>
            </div>

            {/* Mode de paiement */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mode de paiement *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-tech w-full"
                required
                disabled={isLoading}
              >
                <option value="">Sélectionner un mode de paiement</option>
                <option value="carte_bancaire">Carte bancaire</option>
                <option value="virement">Virement bancaire</option>
                <option value="prelevement">Prélèvement automatique</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>

            {/* Récapitulatif */}
            {selectedOffer && (
              <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-primary-900 flex items-center gap-2">
                  <span>📋</span> Récapitulatif
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Offre sélectionnée :</span>
                    <span className="font-bold text-slate-900">{selectedOffer.name}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date de début :</span>
                    <span className="font-bold text-success-600">
                      {startDate.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date de fin :</span>
                    <span className="font-bold text-success-600">
                      {endDate.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-600">Durée :</span>
                    <span className="font-bold text-slate-900">{daysSubscribed} jours</span>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t border-primary-300">
                    <span className="text-slate-600">Montant à payer :</span>
                    <span className="font-black text-primary-600 text-lg">
                      {Number(selectedOffer.price).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Informations importantes */}
            <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-4">
              <h3 className="font-bold text-accent-900 mb-2 flex items-center gap-2">
                <span>💡</span> Informations importantes
              </h3>
              <ul className="space-y-1 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Votre nouvel abonnement commencera le {startDate.toLocaleDateString('fr-FR')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>La durée de l'abonnement dépend de l'offre que vous choisissez</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Vous pourrez générer votre facture depuis la page "Mes Abonnements"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-600 font-bold">•</span>
                  <span>Le paiement est simulé - aucun débit réel ne sera effectué</span>
                </li>
              </ul>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                onClick={onClose}
                className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-neon"
                disabled={isLoading || !selectedOfferId}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Traitement...
                  </>
                ) : (
                  <>🔄 Confirmer le renouvellement</>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}