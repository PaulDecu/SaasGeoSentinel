'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { createOfferSchema, createTenantSchema, createTenantAdminSchema, updateTenantSchema, updateOfferSchema } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, type Offer, type Tenant } from '@/types';
import { offersApi, tenantsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';

export default function AdminPlatformPage() {
  const { user } = useRequireAuth([UserRole.SUPERADMIN]);
  
  const [activeTab, setActiveTab] = useState<'offers' | 'tenants'>('tenants');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [freeOfferConfirm, setFreeOfferConfirm] = useState<{ data: any; offerName: string } | null>(null);

  const offerForm = useForm({
    resolver: zodResolver(createOfferSchema),
  });

  const tenantForm = useForm({
    resolver: zodResolver(createTenantSchema),
  });

  const INIT_PASSWORD = 'initPddc1201@';

  const adminForm = useForm({
    resolver: zodResolver(createTenantAdminSchema),
    defaultValues: { email: '', password: INIT_PASSWORD },
  });

  const editTenantForm = useForm({
    resolver: zodResolver(updateTenantSchema),
  });

  const editOfferForm = useForm({
    resolver: zodResolver(updateOfferSchema),
  });

  const loadOffers = async () => {
    try {
      const data = await offersApi.getAll();
      setOffers(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

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

const doCreateTenant = async (data: any) => {
  try {
    const selectedOffer = offers.find(o => o.id === data.offerId);
    const days = selectedOffer?.trialPeriodDays || 30;
    await tenantsApi.create(data);
    toast.success(`Tenant créé avec succès ! Abonnement actif pour ${days} jours.`);
    setShowTenantForm(false);
    setFreeOfferConfirm(null);
    tenantForm.reset();
    loadData();
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};

const onCreateTenant = async (data: any) => {
  const selectedOffer = offers.find(o => o.id === data.offerId);
  const offerName = selectedOffer?.name || '';
  // ✅ Intercepter si le nom de l'offre contient "gratuit"
  if (offerName.toLowerCase().includes('gratuit')) {
    setFreeOfferConfirm({ data, offerName });
    return;
  }
  await doCreateTenant(data);
};

  const onUpdateTenant = async (data: any) => {
    if (!editingTenant) return;
    
    try {
      await tenantsApi.update(editingTenant.id, data);
      toast.success('Tenant modifié avec succès !');
      setEditingTenant(null);
      editTenantForm.reset();
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    editTenantForm.reset({
      companyName: tenant.companyName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone || '',
      offerId: tenant.offerId,
      // ✅ Convertir les dates au format YYYY-MM-DD pour les inputs date
      subscriptionStart: tenant.subscriptionStart 
        ? new Date(tenant.subscriptionStart).toISOString().split('T')[0] 
        : '',
      subscriptionEnd: tenant.subscriptionEnd 
        ? new Date(tenant.subscriptionEnd).toISOString().split('T')[0] 
        : '',
      addressLine1: tenant.addressLine1 || '',
      addressLine2: tenant.addressLine2 || '',
      postalCode: tenant.postalCode || '',
      city: tenant.city || '',
      country: tenant.country || '',
      siren: tenant.siren || '',
    });
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    editOfferForm.reset({
      name: offer.name,
      price: offer.price,
      endOfSale: offer.endOfSale 
        ? new Date(offer.endOfSale).toISOString().split('T')[0] 
        : '',
    });
  };

  const onUpdateOffer = async (data: any) => {
    if (!editingOffer) return;
    
    try {
      await offersApi.update(editingOffer.id, data);
      toast.success('Offre modifiée avec succès !');
      setEditingOffer(null);
      editOfferForm.reset();
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onCreateAdmin = async (data: any) => {
    if (!selectedTenant) return;
    try {
      await tenantsApi.createAdmin(selectedTenant, { email: data.email, password: INIT_PASSWORD });
      toast.success('Admin créé — un lien d\'initialisation lui a été envoyé par email.', { duration: 5000, icon: '📧' });
      setSelectedTenant(null);
      adminForm.reset({ email: '', password: INIT_PASSWORD });
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

  if (!user) return null;

  return (
    <AuthLayout requiredRoles={[UserRole.SUPERADMIN]}>
      <div className="space-y-8">
        <h1 className="title-tech text-4xl">Administration Plateforme</h1>

        {/* Tabs */}
        <div className="flex gap-2">
                    <Button
            variant={activeTab === 'tenants' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('tenants')}
            className={activeTab === 'tenants' ? 'btn-neon' : ''}
          >
            🏢 Tenants
          </Button>
          <Button
            variant={activeTab === 'offers' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('offers')}
            className={activeTab === 'offers' ? 'btn-neon' : ''}
          >
            📦 Offres
          </Button>

        </div>

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Offres commerciales</h2>
              <Button onClick={() => setShowOfferForm(!showOfferForm)} className="btn-neon">
                {showOfferForm ? 'Annuler' : '+ Nouvelle offre'}
              </Button>
            </div>

            {showOfferForm && (
              <Card className="card-premium">
                <form onSubmit={offerForm.handleSubmit(onCreateOffer)} className="space-y-4">
                  <Input
                    label="Nom de l'offre"
                    {...offerForm.register('name')}
                    error={offerForm.formState.errors.name?.message}
                    placeholder="Starter, Business..."
                    className="input-tech"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nombre max d'utilisateurs"
                      type="number"
                      {...offerForm.register('maxUsers', { valueAsNumber: true })}
                      error={offerForm.formState.errors.maxUsers?.message}
                      className="input-tech"
                    />
                    <Input
                      label="Prix (€)"
                      type="number"
                      step="0.01"
                      {...offerForm.register('price', { valueAsNumber: true })}
                      error={offerForm.formState.errors.price?.message}
                      className="input-tech"
                    />
                  </div>
                  <Input
                    label="Durée (jours)"
                    type="number"
                    {...offerForm.register('trialPeriodDays', { valueAsNumber: true })}
                    error={offerForm.formState.errors.trialPeriodDays?.message}
                    placeholder="30"
                    className="input-tech"
                  />
                  <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3">
                    <p className="text-xs text-primary-700">
                      💡 Le Nombre de jours durant laquelle le service est accessible à vous utilisateurs itinérants
                    </p>
                  </div>
                  <Input
                    label="Date fin commercialisation (optionnel)"
                    type="date"
                    {...offerForm.register('endOfSale')}
                    error={offerForm.formState.errors.endOfSale?.message}
                    className="input-tech"
                  />
                  <Button type="submit" className="btn-neon">Créer l'offre</Button>
                </form>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="grid gap-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="card-premium" data-testid="offer-item">
                    {editingOffer?.id === offer.id ? (
                      // Mode édition
                      <form onSubmit={editOfferForm.handleSubmit(onUpdateOffer)} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Modifier l'offre</h3>
                        
                        <Input
                          label="Nom de l'offre"
                          {...editOfferForm.register('name')}
                          error={editOfferForm.formState.errors.name?.message}
                          className="input-tech"
                        />
                        
                        <Input
                          label="Prix (€)"
                          type="number"
                          step="0.01"
                          {...editOfferForm.register('price', { valueAsNumber: true })}
                          error={editOfferForm.formState.errors.price?.message}
                          className="input-tech"
                        />
                        
                        <Input
                          label="Date fin commercialisation (optionnel)"
                          type="date"
                          {...editOfferForm.register('endOfSale')}
                          error={editOfferForm.formState.errors.endOfSale?.message}
                          className="input-tech"
                        />

                        <div className="bg-accent-50 border-2 border-accent-200 rounded-lg p-3">
                          <p className="text-xs text-accent-700">
                            ⚠️ Le nombre d'utilisateurs max et la période d'essai ne peuvent pas être modifiés pour préserver l'intégrité des abonnements existants.
                          </p>
                        </div>

                        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-3">
                          <p className="text-xs text-slate-600">
                            📊 <strong>Informations non modifiables :</strong>
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            • Utilisateurs max : <strong>{offer.maxUsers}</strong>
                          </p>
                          <p className="text-xs text-slate-600">
                            • Période d'essai : <strong>{offer.trialPeriodDays > 0 ? `${offer.trialPeriodDays} jours` : 'Pas d\'essai'}</strong>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" className="btn-neon">💾 Enregistrer</Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingOffer(null);
                              editOfferForm.reset();
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </form>
                    ) : (
                      // Mode affichage
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{offer.name}</h3>
                          <p className="text-slate-600 mt-2">
                            {offer.maxUsers} utilisateurs max • <span className="font-bold text-primary-600">{Number(offer.price).toFixed(2)}€</span>/mois
                          </p>
                          <p className="text-slate-600 mt-1">
                            🎁 Durée de l'abonnement : <span className="font-semibold text-accent-600">
                              {offer.trialPeriodDays > 0 
                                ? `${offer.trialPeriodDays} jours` 
                                : 'Pas d\'essai'}
                            </span>
                          </p>
                          {offer.endOfSale && (
                            <p className="text-sm text-danger-600 mt-2 font-medium">
                              ⚠️ Fin de commercialisation : {new Date(offer.endOfSale).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => handleEditOffer(offer)}
                          >
                            ✏️ Modifier
                          </Button>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            onClick={() => deleteOffer(offer.id)}
                          >
                            🗑️ Supprimer
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Clients (Tenants)</h2>
              <Button onClick={() => setShowTenantForm(!showTenantForm)} className="btn-neon">
                {showTenantForm ? 'Annuler' : '+ Nouveau tenant'}
              </Button>
            </div>

            {showTenantForm && (
              <Card className="card-premium">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Créer un nouveau tenant</h3>
                <p className="text-sm text-slate-600 mb-4">
                  L'abonnement sera automatiquement activé pour la durée de l'offre choisie à partir d'aujourd'hui.
                </p>
                <form onSubmit={tenantForm.handleSubmit(onCreateTenant)} className="space-y-4">
                  <Input
                    label="Nom de l'entreprise"
                    {...tenantForm.register('companyName')}
                    error={tenantForm.formState.errors.companyName?.message}
                    className="input-tech"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Email de contact"
                      type="email"
                      {...tenantForm.register('contactEmail')}
                      error={tenantForm.formState.errors.contactEmail?.message}
                      className="input-tech"
                    />
                    <Input
                      label="Téléphone (optionnel)"
                      {...tenantForm.register('contactPhone')}
                      error={tenantForm.formState.errors.contactPhone?.message}
                      className="input-tech"
                    />
                  </div>
                  <Input
                    label="SIREN / SIRET (optionnel)"
                    {...tenantForm.register('siren')}
                    error={tenantForm.formState.errors.siren?.message}
                    placeholder="123456789 ou 12345678900012"
                    className="input-tech"
                  />
                  <Input
                    label="Adresse ligne 1 (optionnel)"
                    {...tenantForm.register('addressLine1')}
                    error={tenantForm.formState.errors.addressLine1?.message}
                    placeholder="15 rue de la Paix"
                    className="input-tech"
                  />
                  <Input
                    label="Adresse ligne 2 (optionnel)"
                    {...tenantForm.register('addressLine2')}
                    error={tenantForm.formState.errors.addressLine2?.message}
                    placeholder="Bâtiment A, Étage 3"
                    className="input-tech"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Code postal (optionnel)"
                      {...tenantForm.register('postalCode')}
                      error={tenantForm.formState.errors.postalCode?.message}
                      placeholder="75001"
                      className="input-tech"
                    />
                    <Input
                      label="Ville (optionnel)"
                      {...tenantForm.register('city')}
                      error={tenantForm.formState.errors.city?.message}
                      placeholder="Paris"
                      className="input-tech"
                    />
                    <Input
                      label="Pays (optionnel)"
                      {...tenantForm.register('country')}
                      error={tenantForm.formState.errors.country?.message}
                      placeholder="France"
                      className="input-tech"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Offre
                    </label>
                    <select
                      {...tenantForm.register('offerId')}
                      className="input-tech w-full"
                    >
                      <option value="">Sélectionner une offre</option>
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name} - {Number(offer.price).toFixed(2)}€/mois • {offer.trialPeriodDays > 0 ? `${offer.trialPeriodDays}j d'essai` : 'Sans essai'}
                        </option>
                      ))}
                    </select>
                    {tenantForm.formState.errors.offerId && (
                      <p className="mt-1 text-sm text-danger-600">
                        {tenantForm.formState.errors.offerId.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="btn-neon">Créer le tenant</Button>
                </form>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="grid gap-4">
                {tenants.map((tenant) => (
                  <Card key={tenant.id} className="card-premium" data-testid="tenant-item">
                    {editingTenant?.id === tenant.id ? (
                      // Mode édition
                      <form onSubmit={editTenantForm.handleSubmit(onUpdateTenant)} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Modifier le tenant</h3>
                        <Input
                          label="Nom de l'entreprise"
                          {...editTenantForm.register('companyName')}
                          error={editTenantForm.formState.errors.companyName?.message}
                          className="input-tech"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Email de contact"
                            type="email"
                            {...editTenantForm.register('contactEmail')}
                            error={editTenantForm.formState.errors.contactEmail?.message}
                            className="input-tech"
                          />
                          <Input
                            label="Téléphone"
                            {...editTenantForm.register('contactPhone')}
                            error={editTenantForm.formState.errors.contactPhone?.message}
                            className="input-tech"
                          />
                        </div>
                        <Input
                          label="SIREN / SIRET (optionnel)"
                          {...editTenantForm.register('siren')}
                          error={editTenantForm.formState.errors.siren?.message}
                          placeholder="123456789 ou 12345678900012"
                          className="input-tech"
                        />
                        <Input
                          label="Adresse ligne 1 (optionnel)"
                          {...editTenantForm.register('addressLine1')}
                          error={editTenantForm.formState.errors.addressLine1?.message}
                          placeholder="15 rue de la Paix"
                          className="input-tech"
                        />
                        <Input
                          label="Adresse ligne 2 (optionnel)"
                          {...editTenantForm.register('addressLine2')}
                          error={editTenantForm.formState.errors.addressLine2?.message}
                          placeholder="Bâtiment A, Étage 3"
                          className="input-tech"
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <Input
                            label="Code postal (optionnel)"
                            {...editTenantForm.register('postalCode')}
                            error={editTenantForm.formState.errors.postalCode?.message}
                            placeholder="75001"
                            className="input-tech"
                          />
                          <Input
                            label="Ville (optionnel)"
                            {...editTenantForm.register('city')}
                            error={editTenantForm.formState.errors.city?.message}
                            placeholder="Paris"
                            className="input-tech"
                          />
                          <Input
                            label="Pays (optionnel)"
                            {...editTenantForm.register('country')}
                            error={editTenantForm.formState.errors.country?.message}
                            placeholder="France"
                            className="input-tech"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Offre
                          </label>
                          <select
                            {...editTenantForm.register('offerId')}
                            className="input-tech w-full"
                          >
                            {offers.map((offer) => (
                              <option key={offer.id} value={offer.id}>
                                {offer.name} - {Number(offer.price).toFixed(2)}€/mois • {offer.trialPeriodDays > 0 ? `${offer.trialPeriodDays}j d'essai` : 'Sans essai'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Date de début d'abonnement"
                            type="date"
                            {...editTenantForm.register('subscriptionStart')}
                            error={editTenantForm.formState.errors.subscriptionStart?.message}
                            className="input-tech"
                          />
                          <Input
                            label="Date de fin d'abonnement"
                            type="date"
                            {...editTenantForm.register('subscriptionEnd')}
                            error={editTenantForm.formState.errors.subscriptionEnd?.message}
                            className="input-tech"
                          />
                        </div>
                        <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-3">
                          <p className="text-xs text-primary-700">
                            💡 Modifiez les dates d'abonnement pour prolonger ou ajuster la période de validité.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="btn-neon">💾 Enregistrer</Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingTenant(null);
                              editTenantForm.reset();
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </form>
                    ) : (
                      // Mode affichage
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold text-slate-900">{tenant.companyName}</h3>
                              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-mono font-bold rounded-full border-2 border-primary-400">
                                {tenant.publicId}
                              </span>
                            </div>
                            <p className="text-slate-600 text-sm">
                              📧 {tenant.contactEmail}
                              {tenant.contactPhone && ` • 📞 ${tenant.contactPhone}`}
                            </p>
                            {tenant.siren && (
                              <p className="text-slate-600 text-sm">
                                🏛️ SIREN/SIRET : <span className="font-mono">{tenant.siren}</span>
                              </p>
                            )}
                            {(tenant.addressLine1 || tenant.postalCode || tenant.city || tenant.country) && (
                              <p className="text-slate-600 text-sm">
                                📍 {[tenant.addressLine1, tenant.addressLine2, tenant.postalCode, tenant.city, tenant.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {tenant.offer && (
                              <p className="text-slate-600 text-sm mt-1">
                                Offre : <span className="font-bold text-primary-600">{tenant.offer.name}</span>
                              </p>
                            )}
                            {tenant.subscriptionStart && tenant.subscriptionEnd && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-slate-600">
                                  📅 Début : <span className="font-medium text-slate-900">
                                    {new Date(tenant.subscriptionStart).toLocaleDateString('fr-FR')}
                                  </span>
                                </p>
                                <p className="text-xs">
                                  <span className="text-slate-600">⏰ Expire le :</span>{' '}
                                  <span className={`font-bold ${
                                    new Date(tenant.subscriptionEnd) < new Date()
                                      ? 'text-danger-600'
                                      : Math.ceil((new Date(tenant.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 7
                                      ? 'text-accent-600'
                                      : 'text-success-600'
                                  }`}>
                                    {new Date(tenant.subscriptionEnd).toLocaleDateString('fr-FR')}
                                  </span>
                                  {' '}
                                  <span className="text-slate-500">
                                    ({Math.max(0, Math.ceil((new Date(tenant.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} jour{Math.ceil((new Date(tenant.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 1 ? 's' : ''} restant{Math.ceil((new Date(tenant.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) > 1 ? 's' : ''})
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditTenant(tenant)}
                            >
                              ✏️ Modifier
                            </Button>
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
                              🗑️
                            </Button>
                          </div>
                        </div>

                        {selectedTenant === tenant.id && (
                          <div className="mt-4 pt-4 border-t-2 border-primary-200 bg-primary-50 p-4 rounded-lg">
                            <h4 className="font-bold text-slate-900 mb-3">Créer un admin pour ce tenant</h4>
                            <form onSubmit={adminForm.handleSubmit(onCreateAdmin)} className="space-y-3">
                              <Input
                                label="Email"
                                type="email"
                                {...adminForm.register('email')}
                                error={adminForm.formState.errors.email?.message}
                                placeholder="admin@exemple.com"
                                className="input-tech"
                              />
                              {/* ✅ Pas de champ mot de passe — lien d'initialisation envoyé par email */}
                              <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
                                <span>📧</span>
                                <span>Un lien d'initialisation du mot de passe sera envoyé à l'administrateur (valable 12 heures).</span>
                              </div>
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" className="btn-neon">Créer et envoyer le lien</Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTenant(null);
                                    adminForm.reset({ email: '', password: INIT_PASSWORD });
                                  }}
                                >
                                  Annuler
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ✅ Modale de confirmation offre gratuite */}
        {freeOfferConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🎁</span>
                <h3 className="text-lg font-bold text-slate-900">Offre gratuite sélectionnée</h3>
              </div>
              <p className="text-slate-600 mb-2">
                Vous êtes sur le point de créer un tenant avec l'offre <strong className="text-primary-600">"{freeOfferConfirm.offerName}"</strong>.
              </p>
              <p className="text-slate-600 mb-6">
                Cette offre est <strong>gratuite</strong>. Confirmez-vous la création de ce tenant ?
              </p>
              <div className="flex gap-3">
                <Button
                  className="btn-neon flex-1"
                  onClick={() => doCreateTenant(freeOfferConfirm.data)}
                >
                  ✅ Confirmer
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setFreeOfferConfirm(null)}
                >
                  ← Revenir à la saisie
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}