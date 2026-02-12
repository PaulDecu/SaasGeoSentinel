'use client';

import { useRequireAuth } from '@/lib/hooks/useAuth';
import { Navbar } from './Navbar';
import { Spinner } from '@/components/ui';
import { UserRole } from '@/types';

interface AuthLayoutProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, requiredRoles }) => {
  const { user, isLoading } = useRequireAuth(requiredRoles);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 grid-tech">
        {/* Logo avec effet de chargement */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary-500 blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-primary-400 to-critical-500 rounded-2xl flex items-center justify-center animate-glow shadow-neon-cyan">
            <span className="text-5xl">🛡️</span>
          </div>
        </div>

        {/* Spinner avec texte */}
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" className="text-primary-500" />
          <div className="text-center">
            <p className="text-xl font-black text-slate-900 animate-pulse">
              Initialisation du système
            </p>
            <p className="text-primary-600 font-bold text-sm mt-2">
              Geo<span className="text-critical-600">Sentinel</span> Security Platform
            </p>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">
              Chargement des données sécurisées...
            </p>
          </div>
        </div>

        {/* Barre de progression décorative */}
        <div className="mt-8 w-80 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-primary-500 via-critical-500 to-accent-500 animate-pulse shadow-lg"></div>
        </div>

        {/* Motif décoratif */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-primary-400 via-critical-400 to-accent-400 opacity-50"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 grid-tech">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer tech */}
      <footer className="border-t-2 border-primary-200 py-6 mt-12 bg-white/80">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-critical-500 rounded flex items-center justify-center shadow-md">
                <span className="text-sm">🛡️</span>
              </div>
              <p className="text-slate-600 text-sm">
                <span className="text-primary-600 font-bold">GeoSentinel</span> Security & Tech Platform
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-neon-green"></div>
                <span className="font-medium">Système opérationnel</span>
              </div>
              <span>•</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};