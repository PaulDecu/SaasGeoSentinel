'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { trialRequestSchema, type TrialRequestInput } from '@/lib/validations/schemas';
import imageHero from './1781.png';
import imageWoman from './woman-working.jpg';
import Image from 'next/image'; // Utilisez le composant Image de Next.js pour l'optimisation

export default function HomePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<TrialRequestInput>({
    resolver: zodResolver(trialRequestSchema),
  });

  const onSubmit = async (data: TrialRequestInput) => {
    setIsSubmitting(true);
    try {
      // Simulation d'appel API
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
    <div className="min-h-screen bg-white text-slate-900">
      {/* --- NAVIGATION --- */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-950 tracking-tighter">
            Geo<span className="text-primary-500">Sentinel</span>
          </h1>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-slate-600">
            <a href="#solution" className="hover:text-primary-500 transition-colors">Solution</a>
            <a href="\securite" className="hover:text-primary-500 transition-colors">Sécurité</a>
            <a href="\domaines" className="hover:text-primary-500 transition-colors">Domaines</a>
            <a href="#trial" className="hover:text-primary-500 transition-colors">Essai</a>
          </nav>
          <Link href="/login">
            <Button variant="outline" className="rounded-full border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all">
              CONNEXION
            </Button>
          </Link>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Image de fond : Carte avec points de risques */}
        <div className="absolute inset-0 z-0">
        <Image 
            src={imageHero}
            alt="Carte des risques GeoSentinel" 
            fill // Remplace w-full h-full pour remplir le parent
            priority // Charge l'image immédiatement (LCP)
            className="object-cover opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white"></div>
          <div className="absolute inset-0 grid-tech opacity-30"></div>
        </div>

        <div className="container mx-auto px-6 text-center z-10">
          <span className="inline-block bg-primary-500 text-white text-xs font-black px-4 py-1.5 rounded-full mb-6 tracking-[0.2em] uppercase">
            Intelligence Géospatiale
          </span>
          <h2 className="text-6xl md:text-8xl font-black text-slate-950 mb-8 tracking-tighter leading-[0.9]">
            Anticiper.<br />
            <span className="title-tech">Protéger.</span>
          </h2>
          <p className="text-xl text-slate-700 mb-10 max-w-2xl mx-auto font-bold leading-relaxed" >
            La plateforme SaaS de référence pour la gestion des risques critiques. 
            Identifiez les menaces et sécurisez vos collaborateurs en temps réel.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="\domaines">
              <Button className="btn-neon text-lg px-10 py-6 rounded-xl">Voir les domaines et les usages</Button>
            </a>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section id="solution" className="py-32 bg-white">
        <div className="container mx-auto px-6 space-y-32">
          
          {/* Feature 1: Analyse Terrain */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-950 mb-8 leading-tight">
                Analyse de terrain par tous et pour tous 
              </h3>
              <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed text-justify">
                Nos algorithmes mettent à disposition de vos collaborateurs les informations pertinentes ainsi que les données publiques. 
                Dès qu'un collaborateur approche d'une zone sensible, GeoSentinel déclenche une alerte contextuelle intelligente.
                Chaque collaborateur peut ajouter en temps réel les risques qu'il rencontre pendant sa tournée via l'appli, ou à posteriori via l'application web.
              </p>
              <div className="flex gap-4">
                <div className="status-active font-bold text-sm uppercase tracking-wider text-success-600">Système Actif</div>
              </div>
            </div>
              <div className="order-1 md:order-2 relative group aspect-video">
                  <div className="absolute -inset-4 bg-primary-500/10 rounded-[2rem] blur-2xl group-hover:bg-primary-500/20 transition-all"></div>
                 <Image 
                  src={imageWoman}
                  alt="Femme professionnelle surveillant les risques" 
                  fill
                  priority
                  className="rounded-3xl shadow-2xl border border-slate-200 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
          </div>

          {/* Feature 2: Multi-tenant & Privacy */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="card-premium aspect-video flex flex-col justify-center items-center text-center p-12 bg-slate-950 border-none shadow-neon-violet">
               <h4 className="text-3xl font-black text-white mb-4">Architecture Zero-Trust</h4>
               <p className="text-slate-400 font-light">Confidentialité totale. Vos données de risques sont isolées et vos positions ne sont jamais stockées.</p>
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-950 mb-8 leading-tight">
                Souveraineté des données garantie
              </h3>
              <p className="text-lg text-slate-600 mb-8 font-light leading-relaxed text-justify">
                Chaque organisation bénéficie d'un environnement hermétique. Vos zones de risques 
                restent votre propriété exclusive, invisibles pour les autres acteurs de la plateforme.
              </p>
<div className="mt-4"> {/* Conteneur pour le bouton */}
  <Link href="/securite">
    <Button 
      variant="outline" 
      className="border-2 border-primary-500 text-primary-600 font-bold hover:bg-primary-50"
    >
      En savoir plus sur la sécurité
    </Button>
  </Link>
</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TRIAL SECTION --- */}
      <section id="trial" className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-tech opacity-10"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:row gap-0">
            <div className="grid md:grid-cols-2">
              <div className="p-12 md:p-16 bg-slate-50 border-r border-slate-100">
                <h3 className="text-4xl font-black tracking-tighter text-slate-950 mb-6">
                  Démarrez votre évaluation.
                </h3>
                <p className="text-slate-600 font-light mb-8">
                  Rejoignez les leaders de la sécurité qui font confiance à GeoSentinel pour protéger leurs actifs les plus précieux.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs">✓</span>
                    Déploiement sur le site web en moins de 24h
                  </div>
                  <div className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs">✓</span>
                    Téléchargement de l'application sur les stores Google et Apple
                  </div>
                </div>
              </div>
              
              <div className="p-12 md:p-16">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <Input
                    label="Entreprise"
                    {...register('companyName')}
                    error={errors.companyName?.message}
                    placeholder="Ex: Global Security Ltd"
                    className="input-tech"
                  />
                  <Input
                    label="Email Professionnel"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    placeholder="directeur@entreprise.com"
                    className="input-tech"
                  />
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full btn-neon py-4 rounded-xl text-lg uppercase tracking-widest"
                  >
                    Lancer l'essai gratuit
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-slate-100 bg-white text-center text-slate-400 text-sm font-medium">
        <p>© {new Date().getFullYear()} GeoSentinel Platform. Sécurité & Technologie.</p>
      </footer>
    </div>
  );
}