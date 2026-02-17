'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/schemas';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setIsSuccess(true);
      toast.success('Email envoyé !');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-gray-600 mt-2">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <p className="text-gray-700">
              Si votre email existe dans notre base, vous recevrez un lien de réinitialisation.
            </p>
            <p className="text-sm text-gray-500">
              Le lien est valide pendant 1 heure.
            </p>
            <Link href="/login">
              <Button className="w-full">
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="email@exemple.com"
              autoComplete="email"
            />

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Envoyer le lien
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
