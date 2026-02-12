'use client';

import { useRequireAuth } from '@/lib/hooks/useAuth';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card } from '@/components/ui';
import { UserRole } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useRequireAuth();

  if (!user) return null;

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
            {user.tenant && <> • <span className="font-bold text-slate-900">{user.tenant.companyName}</span></>}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Risques */}
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

          {/* Card Équipes - Admin et Superadmin */}
          {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
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
          )}

          {/* Card Mon Offre - Admin uniquement */}
          {user.role === UserRole.ADMIN && user.tenantId && (
            <Link href="/my-offer">
              <div className="card-success group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 uppercase tracking-wide">Abonnement</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-success-600 transition-colors">
                      Mon Offre
                    </h3>
                  </div>
                  <div className="text-4xl group-hover:scale-110 transition-transform">📦</div>
                </div>
                <p className="text-success-600 hover:text-success-700 text-sm font-bold">
                  Voir mon abonnement →
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

        {/* ✅ Card Paramètres Système - SUPERADMIN uniquement - EN DEHORS DE LA GRILLE */}
        {user.role === UserRole.SUPERADMIN && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-6 text-white hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">⚙️ Paramètres Système</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Configuration géolocalisation
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
                  <div className="text-xs text-purple-100">Tournées • Délais • Alertes</div>
                </div>
              </div>
              <span className="text-2xl">→</span>
            </Link>
          </div>
        )}

        {/* Recent Activity */}
        <Card className="card-premium">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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

        {/* Help Section */}
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-3 flex items-center gap-2">
            <span>💡</span> Besoin d'aide ?
          </h3>
          <div className="space-y-2 text-sm text-slate-700">
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
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}