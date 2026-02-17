'use client';

import { useState, useEffect } from 'react';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Card, Spinner, Button } from '@/components/ui';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, Subscription, SubscriptionStats } from '@/types';
import { subscriptionsApi, tenantsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import { generateInvoicePdf } from '@/lib/utils/generateInvoicePdf';
import toast from 'react-hot-toast';
import Link from 'next/link';

// ─── Interface TenantInfo pour la facturation ──────────────────────────────────
interface TenantInfo {
  companyName: string;
  legalStatus?: string;
  siren?: string;
  address?: string;
  email?: string;
  contactName?: string;
  vatMention?: string;
  logoBase64?: string;
}

// ─── Informations prestataire par défaut ──────────────────────────────────────
const DEFAULT_TENANT_INFO: TenantInfo = {
  companyName: 'raison sociale du client',
  legalStatus: 'Status du client',
  siren: 'siren du client',
  address: 'adresse du client',
  email: 'mail du client',
  contactName: 'nom contact client',
};
// ─────────────────────────────────────────────────────────────────────────────

export default function MySubscriptionsPage() {
  const { user } = useRequireAuth([UserRole.ADMIN]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>(DEFAULT_TENANT_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Début du chargement des données...');
      
      const [subsData, statsData, tenantData] = await Promise.all([
        subscriptionsApi.getMySubscriptions(),
        subscriptionsApi.getStats(),
        tenantsApi.getTenantInfo(),
      ]);
      
      console.log('✅ Données reçues:');
      console.log('- subscriptions:', subsData);
      console.log('- stats:', statsData);
      console.log('- tenant:', tenantData);
      
      setSubscriptions(subsData);
      setStats(statsData);
      
      // Vérifier la structure des données tenant
      if (!tenantData || typeof tenantData !== 'object') {
        throw new Error('Données tenant invalides');
      }
      
      // Transformer les données tenant pour correspondre à TenantInfo
      const fullAddress1 = [
        tenantData.addressLine1,
        tenantData.addressLine2,
      ].filter(Boolean).join(', ');

      const fullAddress2 = [
        tenantData.postalCode,
        tenantData.city,
        tenantData.country
      ].filter(Boolean).join(', ');

      const transformedTenantInfo = {
        companyName: tenantData.companyName || 'Nom non défini',
        legalStatus: '', // Valeur par défaut, à adapter
        siren: tenantData.siren || '',
        address1: fullAddress1 || '',
        address2: fullAddress2 || '',
        email: tenantData.contactEmail || '',
        contactName: '', // Valeur par défaut, à adapter
      };
      
      console.log('🏢 Infos tenant transformées:', transformedTenantInfo);
      setTenantInfo(transformedTenantInfo);
      
    } catch (error) {
      console.error('❌ Erreur détaillée:', error);
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Stack trace:', error.stack);
      
      toast.error(getErrorMessage(error));
      // En cas d'erreur, garder les valeurs par défaut
      console.warn('⚠️ Impossible de charger les infos tenant, utilisation des valeurs par défaut');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Génération PDF ──────────────────────────────────────────────────────────
  const handleGenerateInvoice = async (subscription: Subscription) => {
    setGeneratingId(subscription.id);
    try {
      
      // On importe jsPDF de façon dynamique pour éviter d'alourdir le bundle SSR
      await import('jspdf'); // pré-chargement

      // Personnalisation du numéro de facture : AAAA-NNN
      const year = new Date(subscription.paymentDate).getFullYear();
      const invoiceNumber = `${year}-${String(subscription.id).padStart(3, '0')}`;

      generateInvoicePdf(subscription, tenantInfo, { invoiceNumber });

      toast.success('Facture générée et téléchargée avec succès !', {
        icon: '📄',
      });
    } catch (error) {
      console.error('Erreur génération PDF :', error);
      toast.error('Impossible de générer la facture. Vérifiez que jsPDF est installé.');
    } finally {
      setGeneratingId(null);
    }
  };

  // ── Badge statut ────────────────────────────────────────────────────────────
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
            <Button className="btn-neon">← Retour à Mon Offre</Button>
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
                  <p className="text-2xl font-black text-slate-900">
                    {stats.totalSubscriptions}
                  </p>
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
                  <p className="text-2xl font-black text-slate-900">
                    {stats.totalDaysSubscribed}
                  </p>
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
              <Button className="btn-neon">Renouveler mon abonnement</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {subscriptions.map((subscription) => {
              const price = Number(subscription.paymentAmount) || 0;
              const isGenerating = generatingId === subscription.id;

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
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <span className="flex items-center gap-2">
                            <Spinner size="sm" /> Génération…
                          </span>
                        ) : (
                          '📄 Générer ma facture'
                        )}
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
              <span>
                Cliquez sur <strong>Générer ma facture</strong> pour télécharger
                automatiquement le PDF correspondant à chaque abonnement
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>
                Les abonnements ne peuvent pas se chevaucher — chaque abonnement
                commence après le précédent
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>
                Pour renouveler votre abonnement, retournez sur la page{' '}
                <strong>Mon Offre</strong>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  );
}