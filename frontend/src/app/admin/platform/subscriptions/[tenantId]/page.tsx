'use client';

import { useState, useEffect } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, Spinner, Button } from '@/components/ui';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, Subscription, SubscriptionStats } from '@/types';
import { subscriptionsApi, tenantsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminTenantSubscriptionsPage() {
  const { user } = useRequireAuth([UserRole.SUPERADMIN]);
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantEmail, setTenantEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsData, tenantData] = await Promise.all([
        subscriptionsApi.getByTenant(tenantId),
        tenantsApi.getOne(tenantId),
      ]);
      setSubscriptions(subsData);
      setTenantName(tenantData.companyName);
      setTenantEmail(tenantData.contactEmail);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Calcul stats localement
  const stats = {
    totalSubscriptions: subscriptions.length,
    totalAmountPaid: subscriptions.reduce((sum, s) => sum + Number(s.paymentAmount), 0),
    totalDaysSubscribed: subscriptions.reduce((sum, s) => sum + s.daysSubscribed, 0),
  };

  const getStatusBadge = (subscription: Subscription) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(subscription.subscriptionStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(subscription.subscriptionEndDate);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">⏳ À venir</span>;
    } else if (today >= startDate && today <= endDate) {
      return <span className="px-3 py-1 bg-success-100 text-success-700 text-xs font-bold rounded-full">✅ Actif</span>;
    } else {
      return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">📅 Terminé</span>;
    }
  };

  if (isLoading) {
    return (
      <AuthLayout requiredRoles={[UserRole.SUPERADMIN]}>
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout requiredRoles={[UserRole.SUPERADMIN]}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin/platform/subscriptions">
                <span className="text-slate-400 hover:text-primary-600 transition-colors text-sm font-medium cursor-pointer">
                  ← Tous les abonnements
                </span>
              </Link>
            </div>
            <h1 className="title-tech text-4xl mb-1">{tenantName}</h1>
            <p className="text-slate-500 text-sm">{tenantEmail}</p>
          </div>
          {/* Badge lecture seule */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-2 border-slate-200 rounded-xl">
            <span className="text-slate-500 text-sm">👁️</span>
            <span className="text-slate-600 text-sm font-bold uppercase tracking-wide">Lecture seule</span>
          </div>
        </div>

        {/* Statistiques */}
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
                <p className="text-2xl font-black text-primary-600">{stats.totalAmountPaid.toFixed(2)} €</p>
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

        {/* Liste abonnements — lecture seule (pas de bouton facture) */}
        {subscriptions.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-slate-600">Aucun abonnement pour ce tenant</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((subscription) => {
              const price = Number(subscription.paymentAmount) || 0;
              return (
                <Card key={subscription.id} className="card-premium">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">{subscription.offerName}</h3>
                        {getStatusBadge(subscription)}
                        {subscription.functionalId && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-mono rounded">
                            {subscription.functionalId}
                          </span>
                        )}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600 mb-1">Période</p>
                          <p className="font-medium text-slate-900">
                            {new Date(subscription.subscriptionStartDate).toLocaleDateString('fr-FR')}
                            {' → '}
                            {new Date(subscription.subscriptionEndDate).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{subscription.daysSubscribed} jours</p>
                        </div>
                        <div>
                          <p className="text-slate-600 mb-1">Paiement</p>
                          <p className="font-bold text-primary-600 text-lg">{price.toFixed(2)} €</p>
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
                            {subscription.paymentMethod === 'mollie' && '🌐 Mollie'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Aucun bouton action — lecture seule */}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
