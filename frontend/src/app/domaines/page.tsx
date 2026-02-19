'use client';

import { Card, Button } from '@/components/ui'; 
import Link from 'next/link';
import { 
  HardHat, Wrench, Zap, Truck, Building2, Radio, 
  Factory, ShieldCheck, ClipboardCheck, TreePine, 
  Construction, Store, Mail
} from 'lucide-react';

export default function UseCasesPage() {
  const sectors = [
    {
      title: "BTP & Construction",
      icon: <HardHat className="w-8 h-8 text-orange-400" />,
      tag: "Secteur n°1",
      description: "Protection contre les risques d'écrasement, chutes en fouilles et réseaux enterrés.",
      features: ["Zones de levage (grues)", "Réseaux gaz/élec", "Circulation engins-piétons"],
      targets: "HSE, Conducteur de travaux, Chef de chantier"
    },
    {
      title: "Maintenance Technique",
      icon: <Wrench className="w-8 h-8 text-blue-400" />,
      tag: "Intervention",
      description: "Sécurisation des techniciens en zones isolées ou dangereuses (HT, pressions).",
      features: ["Zones électriques & fluides", "Historique incidents localisés", "Ajout de risque mobile"],
      targets: "Responsable technique, QSE, Techniciens"
    },
    {
      title: "Énergie & Utilities",
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      tag: "Haute Sécurité",
      description: "Gestion des zones à accès réglementé et proximité de lignes haute tension.",
      features: ["Lignes HT / Gaz", "Zones accidents récurrents", "Sous-traitants locaux"],
      targets: "Responsable exploitation, Ingénieur sécurité"
    },
    {
      title: "Livreurs & Logistique",
      icon: <Mail className="w-8 h-8 text-emerald-400" />,
      tag: "Dernier Kilomètre",
      description: "Sécurisation des facteurs et livreurs contre les risques de terrain et agressions.",
      features: ["Zones d'agression / Éboulements", "Dos d'âne & rues étroites", "Quais de chargement"],
      targets: "Responsable flotte, Logistique, Chauffeurs"
    },
    {
      title: "Collectivités & Public",
      icon: <Building2 className="w-8 h-8 text-purple-400" />,
      tag: "Territoire",
      description: "Protection des agents de voirie, espaces verts et gestion des travaux urbains.",
      features: ["Voirie & Propreté", "Bâtiments communaux", "Signalement citoyen/agent"],
      targets: "Responsable voirie, Prévention, DSI"
    },
    {
      title: "Télécoms & Fibre",
      icon: <Radio className="w-8 h-8 text-pink-400" />,
      tag: "Déploiement",
      description: "Sécurisation des interventions en chambres souterraines et réseaux fragiles.",
      features: ["Chambres télécom", "Sous-sols instables", "Zones de travaux tiers"],
      targets: "Chef d'équipe fibre, Déploiement"
    },
    {
      title: "Industrie & Sites ATEX",
      icon: <Factory className="w-8 h-8 text-red-400" />,
      tag: "Critique",
      description: "Maîtrise des flux piétons et zones chimiques sous haute surveillance.",
      features: ["Zones ATEX / Chimiques", "Heatmap d'incidents", "Parcours sécurisés"],
      targets: "QHSE, Directeur de site, Sécurité"
    },
    {
      title: "Sécurité & Gardiennage",
      icon: <ShieldCheck className="w-8 h-8 text-indigo-400" />,
      tag: "Protection",
      description: "Optimisation des rondes et alertes immédiates en zones sensibles.",
      features: ["Rondes de nuit", "Points d'accès critiques", "Historique des alertes"],
      targets: "PME de sécurité, Rondeurs, Prestataires"
    },
    {
      title: "Assurances & Audit",
      icon: <ClipboardCheck className="w-8 h-8 text-cyan-400" />,
      tag: "Expertise",
      description: "Cartographie précise des risques pour les constats et visites d'experts.",
      features: ["Historique géospatial", "Zones sinistrées", "Audit de conformité terrain"],
      targets: "Experts indépendants, Bureaux d'études"
    },
    {
      title: "Agriculture & Forêt",
      icon: <TreePine className="w-8 h-8 text-green-500" />,
      tag: "Environnement",
      description: "Sécurité des travailleurs isolés en terrain accidenté (fossés, glissements).",
      features: ["Trous & Fossés", "Zones d'abattage", "Travailleurs isolés (PTI)"],
      targets: "Coopératives, Exploitations forestières"
    },
    {
      title: "Facility Management",
      icon: <Construction className="w-8 h-8 text-slate-400" />,
      tag: "Multisite",
      description: "Gestion des risques d'accès techniques sur parcs immobiliers diffus.",
      features: ["Toitures & Chaufferies", "Locaux électriques", "Interventions multisites"],
      targets: "ISS, Samsic, Facility Managers"
    },
    {
      title: "Retail & Multi-sites",
      icon: <Store className="w-8 h-8 text-amber-500" />,
      tag: "Services",
      description: "Protection du personnel technique et de sécurité en zones commerciales.",
      features: ["Zones de stockage", "Risques incendie", "Arrière-boutiques techniques"],
      targets: "Supermarchés, Franchises, Hôtellerie"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      
      {/* Fond et Overlay Visuel Original */}
      <div className="fixed inset-0 z-0 bg-slate-950">
        <div className="absolute inset-0 grid-tech opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(2,6,23,1)_100%)]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        
        {/* Header dynamique original */}
        <div className="text-center space-y-4 mb-20">
          <h1 className="title-tech text-4xl md:text-6xl mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-black uppercase tracking-tighter">
            Domaines d'Application
          </h1>
          <p className="text-slate-400 text-xl font-light max-w-3xl mx-auto">
            La technologie <span className="text-primary-400 font-semibold">GeoSentinel</span> s'adapte à chaque terrain où le risque humain et matériel est présent.
          </p>
        </div>

        {/* Grille des Cas d'Usage Originaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectors.map((sector, index) => (
            <Card key={index} className="card-premium group border-white/5 bg-white/5 backdrop-blur-sm hover:border-primary-500/50 transition-all duration-500 p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-slate-900/50 group-hover:scale-110 transition-transform duration-300">
                    {sector.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
                    {sector.tag}
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                  {sector.title}
                </h2>
                
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {sector.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {sector.features.map((feat, i) => (
                    <li key={i} className="flex items-center text-xs text-slate-300">
                      <div className="w-1 h-1 rounded-full bg-primary-500 mr-2" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-white/5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider italic">Décideurs :</span>
                <p className="text-xs text-slate-400 mt-1 font-medium">{sector.targets}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Call to Action Original */}
        <div className="flex flex-col items-center justify-center pt-16 space-y-6">
          <p className="text-slate-400 font-medium">Votre secteur n'est pas listé ? GeoSentinel est 100% configurable.</p>
          <Link href="./#trial">
            <Button className="btn-neon px-10 py-6 text-lg font-bold uppercase tracking-tighter">
              Déployer sur mon terrain
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}