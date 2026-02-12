'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { createOfferSchema, createTenantSchema, createTenantAdminSchema } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, type Offer, type Tenant } from '@/types';
import { offersApi, tenantsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';

export default function AdminPlatformPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth([UserRole.SUPERADMIN]);
  
  const [activeTab, setActiveTab] = useState<'offers' | 'tenants'>('offers');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  const offerForm = useForm({
    resolver: zodResolver(createOfferSchema),
  });

  const tenantForm = useForm({
    resolver: zodResolver(createTenantSchema),
  });

  const adminForm = useForm({
    resolver: zodResolver(createTenantAdminSchema),
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'offers') {
        const data = await offersApi.getAll();
        setOffers(data);
      } else {
        const data = await tenantsApi.getAll();
        setTenants(data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateOffer = async (data: any) => {
    try {
      await offersApi.create(data);
      toast.success('Offre créée avec succès !');
      setShowOfferForm(false);
      offerForm.reset();
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onCreateTenant = async (data: any) => {
    try {
      await tenantsApi.create(data);
      toast.success('Tenant créé avec succès !');
      setShowTenantForm(false);
      tenantForm.reset();
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onCreateAdmin = async (data: any) => {
    if (!selectedTenant) return;
    
    try {
      await tenantsApi.createAdmin(selectedTenant, data);
      toast.success('Admin créé avec succès !');
      setSelectedTenant(null);
      adminForm.reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return;
    
    try {
      await offersApi.delete(id);
      toast.success('Offre supprimée');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteTenant = async (id: string) => {
    if (!confirm('Supprimer ce tenant ?')) return;
    
    try {
      await tenantsApi.delete(id);
      toast.success('Tenant supprimé');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Administration Plateforme</h1>
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            ← Tableau de bord
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'offers' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('offers')}
          >
            Offres
          </Button>
          <Button
            variant={activeTab === 'tenants' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('tenants')}
          >
            Tenants
          </Button>
        </div>

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Offres commerciales</h2>
              <Button onClick={() => setShowOfferForm(!showOfferForm)}>
                {showOfferForm ? 'Annuler' : '+ Nouvelle offre'}
              </Button>
            </div>

            {showOfferForm && (
              <Card className="p-6 mb-6">
                <form onSubmit={offerForm.handleSubmit(onCreateOffer)} className="space-y-4">
                  <Input
                    label="Nom de l'offre"
                    {...offerForm.register('name')}
                    error={offerForm.formState.errors.name?.message}
                    placeholder="Starter, Business..."
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nombre max d'utilisateurs"
                      type="number"
                      {...offerForm.register('maxUsers', { valueAsNumber: true })}
                      error={offerForm.formState.errors.maxUsers?.message}
                    />
                    <Input
                      label="Prix (€)"
                      type="number"
                      step="0.01"
                      {...offerForm.register('price', { valueAsNumber: true })}
                      error={offerForm.formState.errors.price?.message}
                    />
                  </div>
                  <Input
                    label="Date fin commercialisation (optionnel)"
                    type="date"
                    {...offerForm.register('endOfSale')}
                    error={offerForm.formState.errors.endOfSale?.message}
                  />
                  <Button type="submit">Créer l'offre</Button>
                </form>
              </Card>
            )}

            {isLoading ? (
              <Spinner />
            ) : (
              <div className="grid gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{offer.name}</h3>
                        <p className="text-gray-600">
                          {offer.maxUsers} utilisateurs max • {offer.price}€/mois
                        </p>
                        {offer.endOfSale && (
                          <p className="text-sm text-red-600 mt-1">
                            Fin de commercialisation : {new Date(offer.endOfSale).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button variant="danger" size="sm" onClick={() => deleteOffer(offer.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Clients (Tenants)</h2>
              <Button onClick={() => setShowTenantForm(!showTenantForm)}>
                {showTenantForm ? 'Annuler' : '+ Nouveau tenant'}
              </Button>
            </div>

            {showTenantForm && (
              <Card className="p-6 mb-6">
                <form onSubmit={tenantForm.handleSubmit(onCreateTenant)} className="space-y-4">
                  <Input
                    label="Nom de l'entreprise"
                    {...tenantForm.register('companyName')}
                    error={tenantForm.formState.errors.companyName?.message}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Email de contact"
                      type="email"
                      {...tenantForm.register('contactEmail')}
                      error={tenantForm.formState.errors.contactEmail?.message}
                    />
                    <Input
                      label="Téléphone (optionnel)"
                      {...tenantForm.register('contactPhone')}
                      error={tenantForm.formState.errors.contactPhone?.message}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offre
                    </label>
                    <select
                      {...tenantForm.register('offerId')}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="">Sélectionner une offre</option>
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name} - {offer.price}€
                        </option>
                      ))}
                    </select>
                    {tenantForm.formState.errors.offerId && (
                      <p className="mt-1 text-sm text-red-600">
                        {tenantForm.formState.errors.offerId.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit">Créer le tenant</Button>
                </form>
              </Card>
            )}

            {isLoading ? (
              <Spinner />
            ) : (
              <div className="grid gap-4">
                {tenants.map((tenant) => (
                  <Card key={tenant.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{tenant.companyName}</h3>
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-mono rounded">
                            {tenant.publicId}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">
                          📧 {tenant.contactEmail}
                          {tenant.contactPhone && ` • 📞 ${tenant.contactPhone}`}
                        </p>
                        {tenant.offer && (
                          <p className="text-gray-600 text-sm mt-1">
                            Offre : {tenant.offer.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedTenant(tenant.id)}
                        >
                          + Admin
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteTenant(tenant.id)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {/* Form création admin */}
                    {selectedTenant === tenant.id && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-3">Créer un admin pour ce tenant</h4>
                        <form onSubmit={adminForm.handleSubmit(onCreateAdmin)} className="space-y-3">
                          <Input
                            label="Email"
                            type="email"
                            {...adminForm.register('email')}
                            error={adminForm.formState.errors.email?.message}
                            placeholder="admin@exemple.com"
                          />
                          <Input
                            label="Mot de passe"
                            type="password"
                            {...adminForm.register('password')}
                            error={adminForm.formState.errors.password?.message}
                            placeholder="••••••••"
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">Créer</Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTenant(null);
                                adminForm.reset();
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
