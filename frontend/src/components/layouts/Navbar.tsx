'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui';
import { UserRole } from '@/types';
import { useSubscriptionStore } from '@/lib/stores/subscription';

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  // ✅ Lit le store partagé — pas de nouvel appel API, synchronisé avec le dashboard
  const { status: subscriptionStatus, loading: loadingSubscription } = useSubscriptionStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => pathname === path;

  // On attend que le chargement soit terminé pour évaluer l'expiration
  // Pendant le loading, on considère l'abonnement valide (pas de blocage prématuré)
  const isSubscriptionExpired =
    !!user.tenantId &&
    !loadingSubscription &&
    subscriptionStatus !== null &&
    !subscriptionStatus.isValid;

  // Bouton désactivé avec tooltip
  const DisabledNavButton = ({ icon, label }: { icon: string; label: string }) => (
    <div className="relative group/tip">
      <button
        disabled
        className="px-4 py-2 rounded-lg font-bold text-sm text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed flex items-center gap-2"
      >
        <span className="opacity-40">{icon} {label}</span>
        <span>🔒</span>
      </button>
      {/* Tooltip au survol */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        Abonnement expiré — accès suspendu
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b-2 border-primary-200 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary-400 to-critical-500 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
                <span className="text-2xl">🛡️</span>
              </div>
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 block leading-none">
                Geo<span className="text-primary-600">Sentinel</span>
              </span>
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest">Security & Tech</span>
            </div>
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-2">

            {/* Dashboard — toujours accessible */}
            <Link href="/dashboard">
              <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                isActive('/dashboard')
                  ? 'bg-primary-500 text-white shadow-neon-cyan scale-105'
                  : 'text-slate-700 hover:text-primary-600 hover:bg-primary-50'
              }`}>
                <span className="flex items-center gap-2">📊 Dashboard</span>
              </button>
            </Link>

            {/* Plateforme — Superadmin, toujours accessible */}
            {user.role === UserRole.SUPERADMIN && (
              <Link href="/admin/platform">
                <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                  isActive('/admin/platform')
                    ? 'bg-critical-500 text-white shadow-neon-violet scale-105'
                    : 'text-slate-700 hover:text-critical-600 hover:bg-critical-50'
                }`}>
                  <span className="flex items-center gap-2">⚙️ Plateforme</span>
                </button>
              </Link>
            )}

            {/* Équipes — désactivé si abonnement expiré */}
            {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
              isSubscriptionExpired
                ? <DisabledNavButton icon="👥" label="Équipes" />
                : (
                  <Link href="/admin/teams">
                    <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                      isActive('/admin/teams')
                        ? 'bg-accent-500 text-white shadow-neon-orange scale-105'
                        : 'text-slate-700 hover:text-accent-600 hover:bg-accent-50'
                    }`}>
                      <span className="flex items-center gap-2">👥 Équipes</span>
                    </button>
                  </Link>
                )
            )}

            {/* Risques — désactivé si abonnement expiré */}
            {isSubscriptionExpired
              ? <DisabledNavButton icon="⚠️" label="Risques" />
              : (
                <Link href="/admin/risks">
                  <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                    isActive('/admin/risks')
                      ? 'bg-danger-500 text-white shadow-neon-red scale-105'
                      : 'text-slate-700 hover:text-danger-600 hover:bg-danger-50'
                  }`}>
                    <span className="flex items-center gap-2">⚠️ Risques</span>
                  </button>
                </Link>
              )
            }

            {/* Mon Offre — Admin uniquement, TOUJOURS accessible */}
            {user.role === UserRole.ADMIN && user.tenantId && (
              <Link href="/my-offer">
                <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                  isActive('/my-offer')
                    ? isSubscriptionExpired
                      ? 'bg-red-600 text-white scale-105'
                      : 'bg-success-500 text-white shadow-neon-green scale-105'
                    : isSubscriptionExpired
                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-red-300'
                    : 'text-slate-700 hover:text-success-600 hover:bg-success-50'
                }`}>
                  <span className="flex items-center gap-2">
                    {isSubscriptionExpired ? '🔄' : '📦'} Mon Offre
                    {isSubscriptionExpired && (
                      <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">!</span>
                    )}
                  </span>
                </button>
              </Link>
            )}

            {/* Profil — toujours accessible */}
            <Link href="/me">
              <button className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                isActive('/me')
                  ? 'bg-primary-500 text-white shadow-neon-cyan scale-105'
                  : 'text-slate-700 hover:text-primary-600 hover:bg-primary-50'
              }`}>
                <span className="flex items-center gap-2">👤 Profil</span>
              </button>
            </Link>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 leading-none">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
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
                {isSubscriptionExpired
                  ? <div className="w-2 h-2 rounded-full bg-red-500" title="Abonnement expiré" />
                  : <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-neon-green" />
                }
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg font-bold text-sm bg-white text-slate-700 border-2 border-danger-300 hover:bg-danger-50 hover:text-danger-600 hover:border-danger-500 hover:shadow-neon-red transition-all duration-300"
            >
              🚪 Exit
            </button>
          </div>
        </div>
      </div>

      {/* Ligne décorative — rouge si expiré */}
      <div className={`h-1 w-full bg-gradient-to-r ${
        isSubscriptionExpired
          ? 'from-red-500 via-rose-500 to-red-600'
          : 'from-primary-400 via-critical-400 to-accent-400'
      }`} />

      {/* Bandeau d'alerte sous la navbar si expiré */}
      {isSubscriptionExpired && (
        <div className="bg-red-600 text-white text-center py-1.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3">
          <span>🔒 Abonnement expiré — Accès limité</span>
          {user.role === UserRole.ADMIN && (
            <Link href="/my-offer" className="underline hover:text-red-100 font-black transition-colors">
              Renouveler →
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};
