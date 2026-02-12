'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { profileApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/api/client';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();
  const logout = useAuthStore((state) => state.logout);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsChangingPassword(true);
    try {
      await profileApi.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      toast.success('Mot de passe modifié avec succès !');
      reset();
      setShowPasswordForm(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              ← Tableau de bord
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Informations du profil */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informations du compte</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                {user?.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 capitalize">
                {user?.role}
              </div>
            </div>

            {user?.tenant && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entreprise
                </label>
                <div className="space-y-2">
                  <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    {user.tenant.companyName}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID Public: <span className="font-mono">{user.tenant.publicId}</span>
                  </div>
                  {user.tenant.offer && (
                    <div className="text-sm text-gray-600">
                      Offre: {user.tenant.offer.name} ({user.tenant.offer.maxUsers} utilisateurs max)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Changement de mot de passe */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sécurité</h2>
            {!showPasswordForm && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                Changer le mot de passe
              </Button>
            )}
          </div>

          {showPasswordForm ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Mot de passe actuel"
                type="password"
                {...register('oldPassword')}
                error={errors.oldPassword?.message}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <Input
                label="Nouveau mot de passe"
                type="password"
                {...register('newPassword')}
                error={errors.newPassword?.message}
                placeholder="••••••••"
                autoComplete="new-password"
              />

              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                placeholder="••••••••"
                autoComplete="new-password"
              />

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
                <Button
                  type="submit"
                  isLoading={isChangingPassword}
                >
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordForm(false);
                    reset();
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600 text-sm">
              Votre mot de passe est sécurisé. Changez-le régulièrement pour plus de sécurité.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
