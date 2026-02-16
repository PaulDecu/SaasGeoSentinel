'use client';

import { useState, useEffect } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, Spinner, Button } from '@/components/ui';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/types';
import { tenantsApi } from '@/lib/api/resources';
import {  subscriptionsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RenewSubscriptionModal } from '@/components/RenewSubscriptionModal';

export default function MyOfferPage() {
  const { user } = useRequireAuth([UserRole.ADMIN]);
  
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);

  useEffect(() => {
    loadTenantData();
  }, []);

const loadTenantData = async () => {
  if (!user?.tenantId) return;
  
  setIsLoading(true);
  try {
    const data = await tenantsApi.getOne(user.tenantId);
    console.log("Données reçues de l'API:", data); // Pour vérifier la structure
    setTenant(data);
  } catch (error: any) {
    const message = getErrorMessage(error);
    toast.error(`Erreur ${error?.status || ''}: ${message}`);
    
    // Si c'est un 403, on peut rediriger ou afficher un état spécifique
    if (error?.status === 403) {
      setTenant('FORBIDDEN'); 
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleRenew = () => {
    setShowRenewModal(true);
  };

  const handleRenewSubmit = async (offerId: string, paymentMethod: string) => {
    try {
      await subscriptionsApi.renew({ 
        offerId, 
        paymentMethod 
      });
      
      toast.success('✅ Abonnement renouvelé avec succès !');
      
      // Recharger les données du tenant pour mettre à jour les dates
      await loadTenantData();
    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(`Erreur : ${message}`);
      throw error; // Pour que le modal puisse gérer l'erreur
    }
  };

  if (isLoading) {
    return (
      <AuthLayout requiredRoles={[UserRole.ADMIN]}>
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  if (!tenant || !tenant.offer) {
    return (
      <AuthLayout requiredRoles={[UserRole.ADMIN]}>
        <div className="text-center py-12">
          <p className="text-slate-600">Aucune offre associée à votre compte.</p>
        </div>
      </AuthLayout>
    );
  }

  const daysRemaining = tenant.subscriptionEnd 
    ? Math.ceil((new Date(tenant.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

const offerNameLower = tenant.offer.name.toLowerCase();
const isButtonDisabled = (
  (offerNameLower.includes('gratuit') && daysRemaining !== null && daysRemaining > 37) ||
  (offerNameLower.includes('mensuel') && daysRemaining !== null && daysRemaining > 31) ||
  (offerNameLower.includes('annuel') && daysRemaining !== null && daysRemaining > 365)
);

// Calcul du seuil pour le message
const threshold = offerNameLower.includes('gratuit') ? 37 : offerNameLower.includes('mensuel') ? 31 : 365;
const daysToWait = daysRemaining !== null ? daysRemaining - threshold : 0;

const disabledReason = isButtonDisabled 
  ? `Renouvellement possible dans ${daysToWait} jour${daysToWait > 1 ? 's' : ''}.`
  : "";



  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  // ✅ Convertir le prix en nombre de manière sécurisée
  const price = Number(tenant.offer.price) || 0;

  return (
    <AuthLayout requiredRoles={[UserRole.ADMIN]}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="title-tech text-4xl">Mon Offre</h1>
            <Link href="/dashboard/my-subscriptions">
              <Button className="btn-primary">
                📋 Mes Abonnements
              </Button>
            </Link>
          </div>
          <p className="text-slate-600">
            Détails de votre abonnement et gestion du renouvellement
          </p>
        </div>

        {/* Alerte expiration */}
        {isExpired && (
          <div className="card-danger">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-danger-700 mb-2">
                  Abonnement expiré
                </h3>
                <p className="text-slate-700 mb-4">
                  Votre abonnement a expiré le {new Date(tenant.subscriptionEnd).toLocaleDateString('fr-FR')}. 
                  Renouvelez dès maintenant pour continuer à utiliser nos services.
                </p>
                <Button onClick={handleRenew} className="btn-danger-neon">
                  🔄 Renouveler maintenant
                </Button>
              </div>
            </div>
          </div>
        )}

        {isExpiringSoon && !isExpired && (
          <div className="card-warning">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⏰</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-accent-700 mb-2">
                  Expiration proche
                </h3>
                <p className="text-slate-700 mb-2">
                  Votre abonnement expire dans <strong>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong>.
                </p>
                <p className="text-sm text-slate-600">
                  Date d'expiration : {new Date(tenant.subscriptionEnd).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informations entreprise */}
        <Card className="card-premium">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {tenant.companyName}
              </h2>
              <p className="text-sm text-slate-600">
                ID Client : <span className="font-mono font-bold text-primary-600">{tenant.publicId}</span>
              </p>
            </div>
            {!isExpired && daysRemaining !== null && (
              <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                isExpiringSoon 
                  ? 'bg-accent-100 text-accent-700 border-2 border-accent-400'
                  : 'bg-success-100 text-success-700 border-2 border-success-400'
              }`}>
                {isExpiringSoon ? '⏰' : '✅'} {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600 mb-1">Email de contact</p>
              <p className="font-medium text-slate-900">{tenant.contactEmail}</p>
            </div>
            {tenant.contactPhone && (
              <div>
                <p className="text-slate-600 mb-1">Téléphone</p>
                <p className="font-medium text-slate-900">{tenant.contactPhone}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Détails de l'offre */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Carte offre */}
          <Card className="card-premium">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 uppercase tracking-wide mb-1">Offre actuelle</p>
                <h3 className="text-2xl font-black text-primary-600">
                  {tenant.offer.name}
                </h3>
              </div>
              <div className="text-4xl">📦</div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Prix mensuel</span>
                <span className="text-xl font-bold text-slate-900">
                  {price.toFixed(2)} €<span className="text-sm font-normal text-slate-600">/mois</span>
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Utilisateurs max</span>
                <span className="font-bold text-slate-900">
                  {tenant.offer.maxUsers} utilisateur{tenant.offer.maxUsers > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600">Durée de l'offre actuelle</span>
                <span className="font-bold text-slate-900">
                  {tenant.offer.trialPeriodDays > 0 
                    ? `${tenant.offer.trialPeriodDays} jours` 
                    : 'Pas d\'essai'}
                </span>
              </div>
            </div>
          </Card>

          {/* Carte abonnement */}
          <Card className="card-premium">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 uppercase tracking-wide mb-1">Abonnement</p>
                <h3 className="text-2xl font-black text-critical-600">
                  Détails
                </h3>
              </div>
              <div className="text-4xl">📅</div>
            </div>

            <div className="space-y-3">
              <div className="py-2">
                <p className="text-sm text-slate-600 mb-1">Date de début</p>
                <p className="font-bold text-slate-900">
                  {new Date(tenant.subscriptionStart).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {tenant.subscriptionEnd && (
                <div className="py-2">
                  <p className="text-sm text-slate-600 mb-1">Date d'expiration</p>
                  <p className={`font-bold ${isExpired ? 'text-danger-600' : isExpiringSoon ? 'text-accent-600' : 'text-success-600'}`}>
                    {new Date(tenant.subscriptionEnd).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}

              <div className="py-2">
                <p className="text-sm text-slate-600 mb-1">Statut</p>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-danger-500 animate-pulse"></div>
                      <span className="font-bold text-danger-600">Expiré</span>
                    </>
                  ) : isExpiringSoon ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-accent-500 animate-pulse"></div>
                      <span className="font-bold text-accent-600">Expire bientôt</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 rounded-full bg-success-500 animate-pulse"></div>
                      <span className="font-bold text-success-600">Actif</span>
                    </>
                  )}
                </div>
              </div>

              {daysRemaining !== null && (
                <div className="py-2 border-t border-slate-200 mt-2 pt-3">
                  <p className="text-sm text-slate-600 mb-1">Jours restants</p>
                  <p className={`text-2xl font-black ${
                    isExpired ? 'text-danger-600' : 
                    isExpiringSoon ? 'text-accent-600' : 
                    'text-success-600'
                  }`}>
                    {isExpired ? '0' : daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

{/* Actions */}
<Card className="card-premium">
  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div className="flex-1">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        Renouvellement de l'abonnement
      </h3>
      <p className="text-sm text-slate-600">
        Prolongez votre abonnement pour le mois suivant et continuez à bénéficier de nos services.
      </p>
    </div>
    
    <div className="flex flex-col items-end gap-2">
      <Button 
        onClick={handleRenew}
        className={`btn-neon whitespace-nowrap ${isButtonDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        disabled={isButtonDisabled}
      >
        {isButtonDisabled ? '🔒 Renouvellement bloqué' : '🔄 Renouveler ma mensualité'}
      </Button>
      
      {/* Affichage du message explicatif en texte clair */}
      {isButtonDisabled && (
        <span className="text-[10px] uppercase tracking-wider font-bold text-accent-600 bg-accent-50 px-2 py-1 rounded border border-accent-200">
          {disabledReason}
        </span>
      )}
    </div>
  </div>
</Card>

        {/* Informations complémentaires */}
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
          <h3 className="font-bold text-primary-900 mb-3 flex items-center gap-2">
            <span>💡</span> Informations importantes
          </h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Le renouvellement prolonge votre abonnement pour la durée de l'offre choisie</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Vous pouvez renouveler à tout moment, même avant l'expiration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Le montant débité dépendra de l'offre choisie</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Pour toute question, contactez notre support technique</span>
            </li>
          </ul>
        </div>

        {/* Modal de renouvellement */}
        <RenewSubscriptionModal
          isOpen={showRenewModal}
          onClose={() => setShowRenewModal(false)}
          onRenew={handleRenewSubmit}
          currentOfferId={tenant?.offer?.id}
          subscriptionEndDate={tenant?.subscriptionEnd}
        />
      </div>
    </AuthLayout>
  );
}