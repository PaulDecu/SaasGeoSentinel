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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {user.email}
          </h1>
          <p className="text-gray-600 mt-2">Rôle : <span className="capitalize font-medium">{user.role}</span></p>
          {user.tenant && (
            <p className="text-gray-600">Entreprise : <span className="font-medium">{user.tenant.companyName}</span></p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accès rapide</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">Risques</h3>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
            <Link href="/admin/risks" 
                className="text-primary-600 hover:text-primary-700 text-sm mt-4 inline-block"
             > Gérer les risques →
            </Link>
          </Card>

          {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gestion</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">Équipes</h3>
                </div>
                <div className="text-4xl">👥</div>
              </div>
              <Link href="/admin/teams" 
                   className="text-primary-600 hover:text-primary-700 text-sm mt-4 inline-block"
                  > Gérer les utilisateurs →
              </Link>
            </Card>
          )}

          {user.role === UserRole.SUPERADMIN && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Administration</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">Plateforme</h3>
                </div>
                <div className="text-4xl">⚙️</div>
              </div>
              <Link href="/admin/platform" 
                   className="text-primary-600 hover:text-primary-700 text-sm mt-4 inline-block"
                  > Gérer la plateforme →
              </Link>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
          <div className="text-gray-600">
            <p>Dernière connexion : {user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : 'Jamais'}</p>
          </div>
        </Card>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Besoin d'aide ?</h3>
          <p className="text-blue-800 text-sm">
            Utilisez le menu de navigation ci-dessus pour accéder aux différentes sections de l'application.
            Votre rôle ({user.role}) détermine les fonctionnalités auxquelles vous avez accès.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}