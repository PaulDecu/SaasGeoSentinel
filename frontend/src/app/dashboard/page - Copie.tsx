'use client';

import { useRequireAuth } from '@/lib/hooks/useAuth';
import { Spinner } from '@/components/ui';

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">
          Bienvenue, {user?.email}
        </h1>
        <p className="text-gray-600">Rôle : {user?.role}</p>
        {user?.tenant && (
          <p className="text-gray-600">Entreprise : {user.tenant.companyName}</p>
        )}
      </div>
    </div>
  );
}