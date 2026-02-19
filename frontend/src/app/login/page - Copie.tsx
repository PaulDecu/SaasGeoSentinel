'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { loginSchema, type LoginInput } from '@/lib/validations/schemas';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/api/client';
import { AuthLayout } from '@/components/layouts/AuthLayout';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('Connexion réussie !');
      router.push('/dashboard');
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
          <h1 className="text-3xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-600 mt-2">Accédez à votre compte</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="email@exemple.com"
            autoComplete="email"
          />
          
          <Input
            label="Mot de passe"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
          >
            Se connecter
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Pas encore de compte ?{' '}
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Demander un essai gratuit
          </Link>
        </div>
      </Card>
    </div>
  );
}