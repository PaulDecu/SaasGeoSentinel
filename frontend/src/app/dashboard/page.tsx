'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card } from '@/components/ui';
import { UserRole } from '@/types';
import { systemSettingsApi } from '@/lib/api/system-settings';
import { useSubscriptionStore } from '@/lib/stores/subscription';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useRequireAuth();
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(true);


  // Lecture du store partagé (même source que la Navbar)
  const { status: subscriptionStatus, loading: loadingSubscription, fetch: fetchSubscription } = useSubscriptionStore();

  useEffect(() => {
    loadDashboardMessage();
    // Déclenche le chargement du statut d'abonnement (ignoré si déjà chargé)
    fetchSubscription();
  }, []);

  const loadDashboardMessage = async () => {
    try {
      const response = await systemSettingsApi.getDashboardMessage();
      setDashboardMessage(response.dashboardMessage);
    } catch (error) {
      console.error('Erreur chargement message dashboard:', error);
    } finally {
      setLoadingMessage(false);
    }
  };

  if (!user) return null;

  const isSubscriptionExpired =
    !!user.tenantId &&
    !loadingSubscription &&
    subscriptionStatus !== null &&
    !subscriptionStatus.isValid;

  const isSubscriptionWarning =
    !isSubscriptionExpired &&
    subscriptionStatus !== null &&
    subscriptionStatus.isValid &&
    subscriptionStatus.daysRemaining <= 7 &&
    subscriptionStatus.daysRemaining > 0;

  const formattedSubscriptionEnd = subscriptionStatus?.subscriptionEnd
    ? new Date(subscriptionStatus.subscriptionEnd).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (


    <AuthLayout>
     
      <div className="space-y-8">
       

        {/* Header */}
        <div>
          <h1 className="title-tech text-4xl mb-2">
            Bienvenue, {user.email}
          </h1>
          <p className="text-slate-600 text-lg">
            Rôle : <span className="capitalize font-bold text-slate-900">{user.role}</span>
            {user.tenant && (
              <> • <span className="font-bold text-slate-900">{user.tenant.companyName}</span></>
            )}
          </p>
        </div>

        {/* 🔴 Bannière abonnement expiré */}
        {isSubscriptionExpired && (
          <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-xl shadow-2xl p-6 text-white border-2 border-red-400">
            <div className="flex items-start gap-4">
              <div className="text-5xl flex-shrink-0">🔒</div>
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-2 tracking-tight">
                  Abonnement expiré
                </h3>
                <p className="text-white/90 text-base leading-relaxed">
                  Votre abonnement a expiré
                  {formattedSubscriptionEnd && (
                    <> le <strong className="text-white">{formattedSubscriptionEnd}</strong></>
                  )}. L'accès aux fonctionnalités <strong>Risques</strong> et <strong>Équipes</strong> est suspendu.
                </p>
                <p className="text-white/80 text-sm mt-2">
                  Seuls votre profil et la page de renouvellement restent accessibles.
                </p>
                {user.role === UserRole.ADMIN && (
                  <Link href="/my-offer">
                    <button className="mt-4 px-6 py-2.5 bg-white text-red-700 font-black rounded-lg hover:bg-red-50 transition-colors shadow-lg text-sm uppercase tracking-wide">
                      🔄 Renouveler mon abonnement →
                    </button>
                  </Link>
                )}
                {user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN && (
                  <p className="mt-3 text-white/80 text-sm font-semibold">
                    ℹ️ Contactez votre administrateur pour renouveler l'abonnement.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🟡 Bannière expiration proche */}
        {isSubscriptionWarning && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="text-3xl">⏳</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">Abonnement expirant bientôt</h3>
                <p className="text-white/90 text-sm mt-0.5">
                  Il vous reste <strong>{subscriptionStatus?.daysRemaining} jour(s)</strong>
                  {formattedSubscriptionEnd && <> (expire le <strong>{formattedSubscriptionEnd}</strong>)</>}.
                  {user.role === UserRole.ADMIN && (
                    <> <Link href="/my-offer" className="underline font-bold hover:text-white/80">Renouveler maintenant →</Link></>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Message Dashboard Global */}
        {dashboardMessage && !loadingMessage && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📢</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Message important</h3>
                <p className="text-white/90 text-lg leading-relaxed whitespace-pre-wrap">
                  {dashboardMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card Risques */}
          {isSubscriptionExpired ? (
            <div className="card-premium relative overflow-hidden select-none cursor-not-allowed">
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
                <span className="text-4xl">🔒</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abonnement expiré</span>
              </div>
              <div className="opacity-25 pointer-events-none">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 uppercase tracking-wide">Accès rapide</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">Risques</h3>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
                <p className="text-primary-600 text-sm font-bold">Gérer les risques →</p>
              </div>
            </div>
          ) : (
            <Link href="/admin/risks">
              <div className="card-premium group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 uppercase tracking-wide">Accès rapide</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-primary-600 transition-colors">
                      Risques
                    </h3>
                  </div>
                  <div className="text-4xl group-hover:scale-110 transition-transform">⚠️</div>
                </div>
                <p className="text-primary-600 hover:text-primary-700 text-sm font-bold">
                  Gérer les risques →
                </p>
              </div>
            </Link>
          )}

          {/* Card Équipes */}
          {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
            isSubscriptionExpired ? (
              <div className="card-premium relative overflow-hidden select-none cursor-not-allowed">
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
                  <span className="text-4xl">🔒</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abonnement expiré</span>
                </div>
                <div className="opacity-25 pointer-events-none">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-600 uppercase tracking-wide">Gestion</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">Équipes</h3>
                    </div>
                    <div className="text-4xl">👥</div>
                  </div>
                  <p className="text-accent-600 text-sm font-bold">Gérer les utilisateurs →</p>
                </div>
              </div>
            ) : (
              <Link href="/admin/teams">
                <div className="card-premium group cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-600 uppercase tracking-wide">Gestion</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-accent-600 transition-colors">
                        Équipes
                      </h3>
                    </div>
                    <div className="text-4xl group-hover:scale-110 transition-transform">👥</div>
                  </div>
                  <p className="text-accent-600 hover:text-accent-700 text-sm font-bold">
                    Gérer les utilisateurs →
                  </p>
                </div>
              </Link>
            )
          )}

          {/* Card Mon Offre - Admin uniquement, TOUJOURS accessible */}
          {user.role === UserRole.ADMIN && user.tenantId && (
            <Link href="/my-offer">
              <div className={`group cursor-pointer ${isSubscriptionExpired ? 'card-danger' : 'card-success'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 uppercase tracking-wide">
                      {isSubscriptionExpired ? '⚠️ Action requise' : 'Abonnement'}
                    </p>
                    <h3 className={`text-2xl font-bold text-slate-900 mt-1 transition-colors ${
                      isSubscriptionExpired ? 'group-hover:text-critical-600' : 'group-hover:text-success-600'
                    }`}>
                      Mon Offre
                    </h3>
                  </div>
                  <div className="text-4xl group-hover:scale-110 transition-transform">
                    {isSubscriptionExpired ? '🔄' : '📦'}
                  </div>
                </div>
                <p className={`text-sm font-bold ${
                  isSubscriptionExpired
                    ? 'text-critical-600 hover:text-critical-700'
                    : 'text-success-600 hover:text-success-700'
                }`}>
                  {isSubscriptionExpired ? 'Renouveler maintenant →' : 'Voir mon abonnement →'}
                </p>
              </div>
            </Link>
          )}

          {/* Card Plateforme - Superadmin uniquement */}
          {user.role === UserRole.SUPERADMIN && (
            <Link href="/admin/platform">
              <div className="card-danger group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 uppercase tracking-wide">Administration</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-critical-600 transition-colors">
                      Plateforme
                    </h3>
                  </div>
                  <div className="text-4xl group-hover:scale-110 transition-transform">⚙️</div>
                </div>
                <p className="text-critical-600 hover:text-critical-700 text-sm font-bold">
                  Gérer la plateforme →
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Card Paramètres Système - SUPERADMIN uniquement */}
        {user.role === UserRole.SUPERADMIN && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-6 text-white hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">⚙️ Paramètres Système</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Configuration géolocalisation + Message dashboard
                </p>
              </div>
            </div>
            <Link
              href="/admin/system-settings"
              className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚶🚴🚗</span>
                <div>
                  <div className="font-semibold">Gérer les paramètres</div>
                  <div className="text-xs text-purple-100">Tournées • Délais • Alertes • Message</div>
                </div>
              </div>
              <span className="text-2xl">→</span>
            </Link>
          </div>
        )}

        {/* Informations du compte */}
        <Card className="card-premium">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-900">
            <span>📊</span> Informations du compte
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Email</span>
              <span className="font-bold text-slate-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Rôle</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                user.role === UserRole.SUPERADMIN
                  ? 'bg-critical-100 text-critical-700 border-2 border-critical-400'
                  : user.role === UserRole.ADMIN
                  ? 'bg-accent-100 text-accent-700 border-2 border-accent-400'
                  : user.role === UserRole.GESTIONNAIRE
                  ? 'bg-primary-100 text-primary-700 border-2 border-primary-400'
                  : 'bg-success-100 text-success-700 border-2 border-success-400'
              }`}>
                {user.role}
              </span>
            </div>
            {user.tenant && (
              <>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">Entreprise</span>
                  <span className="font-bold text-slate-900">{user.tenant.companyName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-600">ID Client</span>
                  <span className="font-mono font-bold text-primary-600">{user.tenant.publicId}</span>
                </div>
                {!loadingSubscription && subscriptionStatus && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Abonnement</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      isSubscriptionExpired
                        ? 'bg-red-100 text-red-700 border-2 border-red-400'
                        : isSubscriptionWarning
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                        : 'bg-success-100 text-success-700 border-2 border-success-400'
                    }`}>
                      {isSubscriptionExpired
                        ? '🔒 Expiré'
                        : isSubscriptionWarning
                        ? `⏳ ${subscriptionStatus.daysRemaining}j restants`
                        : '✅ Actif'}
                    </span>
                  </div>
                )}
                {user.tenant.offer && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600">Offre</span>
                    <span className="font-bold text-slate-900">
                      {user.tenant.offer.name} ({user.tenant.offer.maxUsers} utilisateurs max)
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Dernière connexion</span>
              <span className="font-medium text-slate-900">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : 'Jamais'}
              </span>
            </div>
          </div>
        </Card>

        {/* Help / Accès limité */}
        <div className={`rounded-xl p-6 border-2 ${
          isSubscriptionExpired ? 'bg-red-50 border-red-200' : 'bg-primary-50 border-primary-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            isSubscriptionExpired ? 'text-red-900' : 'text-primary-900'
          }`}>
            <span>{isSubscriptionExpired ? '🔒' : '💡'}</span>
            {isSubscriptionExpired ? 'Accès limité' : "Besoin d'aide ?"}
          </h3>
          <div className={`space-y-2 text-sm ${isSubscriptionExpired ? 'text-red-800' : 'text-slate-700'}`}>
            {isSubscriptionExpired ? (
              <>
                <p>
                  Votre abonnement est expiré. L'accès aux fonctionnalités <strong>Risques</strong> et <strong>Équipes</strong> est suspendu.
                </p>
                {user.role === UserRole.ADMIN ? (
                  <p className="font-medium text-red-700">
                    👉 Rendez-vous dans{' '}
                    <Link href="/my-offer" className="underline font-bold hover:text-red-900">
                      Mon Offre
                    </Link>{' '}
                    pour renouveler votre abonnement et retrouver l'accès complet.
                  </p>
                ) : (
                  <p className="font-medium text-red-700">
                    👉 Contactez votre administrateur pour renouveler l'abonnement.
                  </p>
                )}
              </>
            ) : (
              <>
                <p>
                  Utilisez le menu de navigation ci-dessus pour accéder aux différentes sections de l'application.
                </p>
                <p>
                  Votre rôle <strong className="text-primary-700">({user.role})</strong> détermine les fonctionnalités auxquelles vous avez accès.
                </p>
                {user.role === UserRole.ADMIN && (
                  <p className="font-medium text-primary-700">
                    ✨ En tant qu'administrateur, vous pouvez consulter et renouveler votre abonnement dans la section "Mon Offre".
                  </p>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </AuthLayout>
  );
}
