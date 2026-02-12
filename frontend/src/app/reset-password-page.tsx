'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/schemas';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      toast.error('Token manquant');
      router.push('/login');
    }
  }, [token, router]);

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, data.password);
      setIsSuccess(true);
      toast.success('Mot de passe réinitialisé !');
      
      // Redirection après 2 secondes
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-gray-600 mt-2">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <p className="text-gray-700 font-medium">
              Votre mot de passe a été réinitialisé avec succès !
            </p>
            <p className="text-sm text-gray-500">
              Redirection vers la page de connexion...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Input
              label="Confirmer le mot de passe"
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

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Réinitialiser le mot de passe
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Retour à la connexion
          </Link>
        </div>
      </Card>
    </div>
  );
}
