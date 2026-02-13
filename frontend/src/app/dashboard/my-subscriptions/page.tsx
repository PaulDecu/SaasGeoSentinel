'use client';

import { useState, useEffect } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, Spinner, Button } from '@/components/ui';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, Subscription, SubscriptionStats } from '@/types';
import { subscriptionsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function MySubscriptionsPage() {
  const { user } = useRequireAuth([UserRole.ADMIN]);
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsData, statsData] = await Promise.all([
        subscriptionsApi.getMySubscriptions(),
        subscriptionsApi.getStats(),
      ]);
      setSubscriptions(subsData);
      setStats(statsData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = (subscription: Subscription) => {
    toast('Fonctionnalité de génération de facture en cours de développement', {
      icon: '🚧',
    });
  };

  const getStatusBadge = (subscription: Subscription) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(subscription.subscriptionStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(subscription.subscriptionEndDate);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
          ⏳ À venir
        </span>
      );
    } else if (today >= startDate && today <= endDate) {
      return (
        <span className="px-3 py-1 bg-success-100 text-success-700 text-xs font-bold rounded-full">
          ✅ Actif
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
          📅 Terminé
        </span>
      );
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

  return (
    <AuthLayout requiredRoles={[UserRole.ADMIN]}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="title-tech text-4xl mb-2">Mes Abonnements</h1>
            <p className="text-slate-600">
              Historique et gestion de vos abonnements
            </p>
          </div>
          <Link href="/my-offer">
            <Button className="btn-neon">
              ← Retour à Mon Offre
            </Button>
          </Link>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-premium">
              <div className="flex items-center gap-3">
                <div className="text-4xl">📊</div>
                <div>
                  <p className="text-sm text-slate-600">Total abonnements</p>
                  <p className="text-2xl font-black text-slate-900">{stats.totalSubscriptions}</p>
                </div>
              </div>
            </Card>

            <Card className="card-premium">
              <div className="flex items-center gap-3">
                <div className="text-4xl">💰</div>
                <div>
                  <p className="text-sm text-slate-600">Total payé</p>
                  <p className="text-2xl font-black text-primary-600">
                    {stats.totalAmountPaid.toFixed(2)} €
                  </p>
                </div>
              </div>
            </Card>

            <Card className="card-premium">
              <div className="flex items-center gap-3">
                <div className="text-4xl">📅</div>
                <div>
                  <p className="text-sm text-slate-600">Total jours</p>
                  <p className="text-2xl font-black text-slate-900">{stats.totalDaysSubscribed}</p>
                </div>
              </div>
            </Card>


          </div>
        )}

        {/* Liste des abonnements */}
        {subscriptions.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-600 mb-4">Aucun abonnement enregistré</p>
            <Link href="/dashboard/my-offer">
              <Button className="btn-neon">
                Renouveler mon abonnement
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((subscription) => {
              const price = Number(subscription.paymentAmount) || 0;
              
              return (
                <Card key={subscription.id} className="card-premium">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Informations principales */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">
                          {subscription.offerName}
                        </h3>
                        {getStatusBadge(subscription)}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 mb-1">Période</p>
                          <p className="font-medium text-slate-900">
                            {new Date(subscription.subscriptionStartDate).toLocaleDateString('fr-FR')}
                            {' → '}
                            {new Date(subscription.subscriptionEndDate).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {subscription.daysSubscribed} jours
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-600 mb-1">Paiement</p>
                          <p className="font-bold text-primary-600 text-lg">
                            {price.toFixed(2)} €
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(subscription.paymentDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-600 mb-1">Mode de paiement</p>
                          <p className="font-medium text-slate-900">
                            {subscription.paymentMethod === 'non_specifie' && 'Non spécifié'}
                            {subscription.paymentMethod === 'carte_bancaire' && '💳 Carte bancaire'}
                            {subscription.paymentMethod === 'virement' && '🏦 Virement'}
                            {subscription.paymentMethod === 'prelevement' && '🔄 Prélèvement'}
                            {subscription.paymentMethod === 'cheque' && '📝 Chèque'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bouton facture */}
                    <div className="flex md:flex-col gap-2">
                      <Button
                        onClick={() => handleGenerateInvoice(subscription)}
                        className="btn-primary"
                        size="sm"
                      >
                        📄 Générer ma facture
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Informations */}
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
          <h3 className="font-bold text-primary-900 mb-3 flex items-center gap-2">
            <span>💡</span> Informations
          </h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Retrouvez ici l'historique complet de tous vos abonnements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Vous pouvez générer une facture pour chaque abonnement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Les abonnements ne peuvent pas se chevaucher - chaque abonnement commence après le précédent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Pour renouveler votre abonnement, retournez sur la page "Mon Offre"</span>
            </li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  );
}
