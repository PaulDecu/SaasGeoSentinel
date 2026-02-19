'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { profileApi } from '@/lib/api/auth';
import { tenantsApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import { UserRole } from '@/types';

const companySchema = z.object({
  companyName: z.string().min(1, 'Requis'),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  siren: z.string().optional(),
});
type CompanyInput = z.infer<typeof companySchema>;

export default function ProfilePage() {
  const { user } = useRequireAuth();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const companyForm = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
  });

  // Charger les infos du tenant si admin
  useEffect(() => {
    if (isAdmin && user?.tenantId) {
      loadTenantInfo();
    }
  }, [isAdmin, user]);

  const loadTenantInfo = async () => {
    setIsLoadingTenant(true);
    try {
      const data = await tenantsApi.getTenantInfo();
      setTenantInfo(data);
      companyForm.reset({
        companyName: data.companyName ?? '',
        contactPhone: data.contactPhone ?? '',
        addressLine1: data.addressLine1 ?? '',
        addressLine2: data.addressLine2 ?? '',
        postalCode: data.postalCode ?? '',
        city: data.city ?? '',
        country: data.country ?? '',
        siren: data.siren ?? '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const onSubmitPassword = async (data: ChangePasswordInput) => {
    setIsChangingPassword(true);
    try {
      await profileApi.changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword });
      toast.success('Mot de passe modifié avec succès !');
      passwordForm.reset();
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onSubmitCompany = async (data: CompanyInput) => {
    // 1. Contrôle du format SIREN/SIRET (9 ou 14 chiffres)
  // On ne valide que si le champ n'est pas vide (car il peut être NULL en BDD)
  if (data.siren && !/^[0-9]{9}([0-9]{5})?$/.test(data.siren)) {
    toast.error("Format invalide : le numéro SIREN/SIRET doit comporter 9 ou 14 chiffres.");
    return; // On arrête l'exécution ici
  }
    setIsSavingCompany(true);
    try {
      await tenantsApi.updateMe(data);
      toast.success('Informations entreprise mises à jour !');
      setTenantInfo({ ...tenantInfo, ...data });
      setShowCompanyForm(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingCompany(false);
    }
  };

  if (!user) return null;

  return (
    <AuthLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Mon Profil</h1>

        {/* Informations du compte */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Informations du compte</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">{user.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 capitalize">{user.role}</div>
            </div>
            {user.tenant && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
                <div className="space-y-1">
                  <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">{user.tenant.companyName}</div>
                  <div className="text-sm text-gray-600">ID Public: <span className="font-mono">{user.tenant.publicId}</span></div>
                  {user.tenant.offer && (
                    <div className="text-sm text-gray-600">Offre: {user.tenant.offer.name} ({user.tenant.offer.maxUsers} utilisateurs max)</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Informations entreprise — ADMIN uniquement */}
        {isAdmin && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Mon Entreprise</h2>
              {!showCompanyForm && (
                <Button variant="secondary" size="sm" onClick={() => setShowCompanyForm(true)}>
                  Modifier
                </Button>
              )}
            </div>

            {isLoadingTenant ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : showCompanyForm ? (
              <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Nom de l'entreprise *"
                      {...companyForm.register('companyName')}
                      error={companyForm.formState.errors.companyName?.message}
                    />
                  </div>
                  <Input
                    label="Téléphone"
                    {...companyForm.register('contactPhone')}
                  />
                  <Input
                    label="SIREN"
                    {...companyForm.register('siren')}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Adresse (ligne 1)"
                      {...companyForm.register('addressLine1')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Adresse (ligne 2)"
                      {...companyForm.register('addressLine2')}
                    />
                  </div>
                  <Input
                    label="Code postal"
                    {...companyForm.register('postalCode')}
                  />
                  <Input
                    label="Ville"
                    {...companyForm.register('city')}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Pays"
                      {...companyForm.register('country')}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" isLoading={isSavingCompany}>Enregistrer</Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowCompanyForm(false); loadTenantInfo(); }}>
                    Annuler
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Nom', value: tenantInfo?.companyName },
                  { label: 'Téléphone', value: tenantInfo?.contactPhone },
                  { label: 'SIREN', value: tenantInfo?.siren },
                  { label: 'Adresse', value: tenantInfo?.addressLine1 },
                  { label: 'Complément', value: tenantInfo?.addressLine2 },
                  { label: 'Code postal', value: tenantInfo?.postalCode },
                  { label: 'Ville', value: tenantInfo?.city },
                  { label: 'Pays', value: tenantInfo?.country },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <p className="text-gray-500">{label}</p>
                    <p className="font-medium text-gray-900">{value}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </Card>
        )}

        {/* Sécurité — changement de mot de passe */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sécurité</h2>
            {!showPasswordForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowPasswordForm(true)}>
                Changer le mot de passe
              </Button>
            )}
          </div>
          {showPasswordForm ? (
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <Input label="Mot de passe actuel" type="password" {...passwordForm.register('oldPassword')} error={passwordForm.formState.errors.oldPassword?.message} autoComplete="current-password" />
              <Input label="Nouveau mot de passe" type="password" {...passwordForm.register('newPassword')} error={passwordForm.formState.errors.newPassword?.message} autoComplete="new-password" />
              <Input label="Confirmer le nouveau mot de passe" type="password" {...passwordForm.register('confirmPassword')} error={passwordForm.formState.errors.confirmPassword?.message} autoComplete="new-password" />
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">Le mot de passe doit contenir :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Au moins 8 caractères</li>
                  <li>Une majuscule</li>
                  <li>Une minuscule</li>
                  <li>Un chiffre</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={isChangingPassword}>Enregistrer</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowPasswordForm(false); passwordForm.reset(); }}>Annuler</Button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600 text-sm">Votre mot de passe est sécurisé. Changez-le régulièrement pour plus de sécurité.</p>
          )}
        </Card>
      </div>
    </AuthLayout>
  );
}
