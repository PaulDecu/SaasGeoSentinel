'use client';

import { useState, useEffect } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, Spinner } from '@/components/ui';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/types';
import { tenantsApi, subscriptionsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface TenantSubscriptionRow {
  tenantId: string;
  companyName: string;
  contactEmail: string;
  latestEndDate: string | null;
  daysRemaining: number | null;
  status: 'active' | 'expiring' | 'expired' | 'none';
}

export default function AdminSubscriptionsPage() {
  const { user } = useRequireAuth([UserRole.SUPERADMIN]);
  const router = useRouter();
  const [rows, setRows] = useState<TenantSubscriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Charger tous les tenants
      const tenants = await tenantsApi.getAll();

      // 2. Pour chaque tenant, récupérer ses abonnements en parallèle
      const rows = await Promise.all(
        tenants.map(async (tenant) => {
          try {
            const subs = await subscriptionsApi.getByTenant(tenant.id);

            if (subs.length === 0) {
              return {
                tenantId: tenant.id,
                companyName: tenant.companyName,
                contactEmail: tenant.contactEmail,
                latestEndDate: null,
                daysRemaining: null,
                status: 'none' as const,
              };
            }

            // Trouver la date de fin la plus tardive
            const latest = subs.reduce((a, b) =>
              new Date(a.subscriptionEndDate) > new Date(b.subscriptionEndDate) ? a : b
            );

            const endDate = new Date(latest.subscriptionEndDate);
            endDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysRemaining = Math.ceil(
              (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            let status: TenantSubscriptionRow['status'];
            if (daysRemaining < 0) status = 'expired';
            else if (daysRemaining <= 14) status = 'expiring';
            else status = 'active';

            return {
              tenantId: tenant.id,
              companyName: tenant.companyName,
              contactEmail: tenant.contactEmail,
              latestEndDate: latest.subscriptionEndDate,
              daysRemaining,
              status,
            };
          } catch {
            return {
              tenantId: tenant.id,
              companyName: tenant.companyName,
              contactEmail: tenant.contactEmail,
              latestEndDate: null,
              daysRemaining: null,
              status: 'none' as const,
            };
          }
        })
      );

      // Tri : expirés en haut, puis par jours restants croissant, puis actifs
      rows.sort((a, b) => {
        if (a.status === 'expired' && b.status !== 'expired') return -1;
        if (b.status === 'expired' && a.status !== 'expired') return 1;
        if (a.daysRemaining !== null && b.daysRemaining !== null)
          return a.daysRemaining - b.daysRemaining;
        return 0;
      });

      setRows(rows);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRows = rows.filter(
    (r) =>
      r.companyName.toLowerCase().includes(search.toLowerCase()) ||
      r.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (row: TenantSubscriptionRow) => {
    switch (row.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success-100 text-success-700 text-xs font-bold rounded-full border border-success-300">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
            Actif
          </span>
        );
      case 'expiring':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Expire bientôt
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Expiré
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full border border-slate-200">
            Aucun abonnement
          </span>
        );
    }
  };

  const getDaysLabel = (row: TenantSubscriptionRow) => {
    if (row.daysRemaining === null) return '—';
    if (row.daysRemaining < 0) return `Expiré il y a ${Math.abs(row.daysRemaining)}j`;
    if (row.daysRemaining === 0) return 'Expire aujourd\'hui';
    return `${row.daysRemaining} jour${row.daysRemaining > 1 ? 's' : ''}`;
  };

  const getDaysColor = (row: TenantSubscriptionRow) => {
    if (row.daysRemaining === null) return 'text-slate-400';
    if (row.daysRemaining < 0) return 'text-red-600 font-bold';
    if (row.daysRemaining <= 14) return 'text-amber-600 font-bold';
    return 'text-success-700 font-semibold';
  };

  // Compteurs résumé
  const countExpired = rows.filter(r => r.status === 'expired').length;
  const countExpiring = rows.filter(r => r.status === 'expiring').length;
  const countActive = rows.filter(r => r.status === 'active').length;

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
        <div>
          <h1 className="title-tech text-4xl mb-2">Abonnements</h1>
          <p className="text-slate-600">Vue globale des abonnements par tenant</p>
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="card-premium">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center text-lg">✅</div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Actifs</p>
                <p className="text-2xl font-black text-success-700">{countActive}</p>
              </div>
            </div>
          </Card>
          <Card className="card-premium">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg">⚠️</div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Expirent bientôt</p>
                <p className="text-2xl font-black text-amber-600">{countExpiring}</p>
              </div>
            </div>
          </Card>
          <Card className="card-premium">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg">🔒</div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Expirés</p>
                <p className="text-2xl font-black text-red-600">{countExpired}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recherche */}
        <Card className="p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher par nom ou email..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </Card>

        {/* Tableau */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fin d'abonnement</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Jours restants</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Aucun tenant trouvé
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.tenantId}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/platform/subscriptions/${row.tenantId}`)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {row.companyName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{row.contactEmail}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {row.latestEndDate
                          ? new Date(row.latestEndDate).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className={`px-6 py-4 ${getDaysColor(row)}`}>
                        {getDaysLabel(row)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(row)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-slate-300 group-hover:text-primary-500 transition-colors text-lg">→</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}
