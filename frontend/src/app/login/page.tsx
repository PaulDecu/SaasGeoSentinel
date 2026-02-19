'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // N'oubliez pas d'importer Image de Next.js
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { loginSchema, type LoginInput } from '@/lib/validations/schemas';
import { useAuthStore } from '@/lib/stores/auth';
import { getErrorMessage } from '@/lib/api/client';

// Importez votre image de fond. Si elle est dans `public/`, utilisez un chemin absolu.
// Si elle est dans le même dossier que page.tsx, utilisez './nom-de-votre-image.jpg'
// Exemple avec une image publique :
//const backgroundImage = "/images/abstract-tech-bg.jpg"; // Créez ce fichier dans public/images/


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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      
      {/* --- IMAGE DE FOND --- */}

      {/* Overlay pour assombrir ou donner une teinte */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/40 to-transparent"></div>


      {/* --- CONTENEUR DE LA CARTE DE CONNEXION (au-dessus de l'image de fond) --- */}
      <Card className="w-full max-w-md p-10 card-premium relative z-10"> {/* z-10 pour être au-dessus du fond */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">
            Connexion
          </h1>
          <p className="text-slate-500 mt-3 text-sm font-light uppercase tracking-widest">
            Accédez à votre compte GeoSentinel
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="email@exemple.com"
            autoComplete="email"
            className="input-tech"
          />
          
          <Input
            label="Mot de passe"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
            autoComplete="current-password"
            className="input-tech"
          />

          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full btn-neon"
          >
            Se connecter
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-600 border-t border-slate-100 pt-6">
          Pas encore de compte ?{' '}
          <Link href="/#trial" className="text-primary-600 hover:text-primary-700 font-bold">
            Demander un essai gratuit
          </Link>
        </div>
      </Card>
    </div>
  );
}