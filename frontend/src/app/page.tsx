'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card } from '@/components/ui';
import { trialRequestSchema, type TrialRequestInput } from '@/lib/validations/schemas';
import { AuthLayout } from '@/components/layouts/AuthLayout';

export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<TrialRequestInput>({
    resolver: zodResolver(trialRequestSchema),
  });

  const onSubmit = async (data: TrialRequestInput) => {
    setIsSubmitting(true);
    try {
      // TODO: Implémenter l'API pour les demandes d'essai
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Demande envoyée avec succès !');
      reset();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">GeoSentinel</h1>
          <Link href="/login">
            <Button variant="primary">Connexion</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Gestion des risques géolocalisés
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Plateforme SaaS  pour identifier, cartographier et gérer 
          les risques afin d'ALERTER en temps réel vos collaborateurs itinérants.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">Géolocalisation</h3>
            <p className="text-gray-600 text-justify">Cartographiez précisément vos risques, afin de protéger vos collaborateurs :
              Dès qu'ils approchent d'une zone de risque une notification est déclenchée sur leur téléphone.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Multi-tenant</h3>
            <p className="text-gray-600 text-justify">Isolation complète des données pour chaque entreprise. <br />Vos risques restent privés : Uniquement vus par vos propres utilisateurs.</p>
          </Card>
          <Card className="p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Sécurisé</h3>
            <p className="text-gray-600 text-justify">Plateforme Haute Disponibilité.<br />
                          Vie privée respectée : les positions des utilisateurs sont inconnues du système.
            </p>
          </Card>
        </div>

        {/* Trial Form */}
        <Card className="max-w-md mx-auto p-8">
          <h3 className="text-2xl font-bold mb-6">Essai gratuit</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nom de l'entreprise"
              {...register('companyName')}
              error={errors.companyName?.message}
              placeholder="Acme Corp"
            />
            <Input
              label="Email professionnel"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="contact@acme.com"
            />
            <Input
              label="Téléphone (optionnel)"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+33 1 23 45 67 89"
            />
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full"
            >
              Demander un essai gratuit
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}