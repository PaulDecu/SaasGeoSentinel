'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { createRiskSchema, updateRiskSchema } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, type Risk, RiskCategory, RiskSeverity } from '@/types';
import { risksApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import { AuthLayout } from '@/components/layouts/AuthLayout';

export default function AdminRisksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth([
    UserRole.SUPERADMIN,
    UserRole.ADMIN, 
    UserRole.GESTIONNAIRE,
    UserRole.UTILISATEUR
  ]);
  
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const riskForm = useForm({
    resolver: zodResolver(editingRisk ? updateRiskSchema : createRiskSchema),
  });

  useEffect(() => {
    loadRisks();
  }, []);

  useEffect(() => {
    if (editingRisk) {
      riskForm.reset({
        title: editingRisk.title,
        description: editingRisk.description || '',
        category: editingRisk.category,
        severity: editingRisk.severity,
        latitude: editingRisk.latitude,
        longitude: editingRisk.longitude,
      });
    }
  }, [editingRisk]);

  const loadRisks = async () => {
    setIsLoading(true);
    try {
      const data = await risksApi.getAll();
      setRisks(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingRisk) {
        await risksApi.update(editingRisk.id, data);
        toast.success('Risque mis à jour !');
        setEditingRisk(null);
      } else {
        await risksApi.create(data);
        toast.success('Risque créé avec succès !');
      }
      setShowRiskForm(false);
      riskForm.reset();
      loadRisks();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteRisk = async (id: string) => {
    if (!confirm('Supprimer ce risque ?')) return;
    
    try {
      await risksApi.delete(id);
      toast.success('Risque supprimé');
      loadRisks();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const startEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setShowRiskForm(true);
  };

  const cancelEdit = () => {
    setEditingRisk(null);
    setShowRiskForm(false);
    riskForm.reset();
  };

  // Filtres
  const filteredRisks = risks.filter(risk => {
    const matchCategory = categoryFilter === 'all' || risk.category === categoryFilter;
    const matchSeverity = severityFilter === 'all' || risk.severity === severityFilter;
    return matchCategory && matchSeverity;
  });

  // Couleurs selon sévérité
  const getSeverityColor = (severity: RiskSeverity) => {
    switch (severity) {
      case RiskSeverity.FAIBLE:
        return 'bg-green-100 text-green-700';
      case RiskSeverity.MODERE:
        return 'bg-yellow-100 text-yellow-700';
      case RiskSeverity.ELEVE:
        return 'bg-orange-100 text-orange-700';
      case RiskSeverity.CRITIQUE:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Sécurité supplémentaire : si pas de user après chargement, on ne rend rien
  if (!user) return null;

  return (
<AuthLayout requiredRoles={[UserRole.ADMIN, UserRole.GESTIONNAIRE, UserRole.SUPERADMIN, UserRole.UTILISATEUR]}>
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Titre</h1>
     

    <div className="min-h-screen bg-gray-50">


      <div className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => {
            setShowRiskForm(!showRiskForm);
            if (showRiskForm) cancelEdit();
          }}>
            {showRiskForm ? 'Annuler' : '+ Nouveau risque'}
          </Button>
        </div>

        {/* Formulaire */}
        {showRiskForm && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingRisk ? 'Modifier le risque' : 'Nouveau risque'}
            </h3>
            <form onSubmit={riskForm.handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Titre"
                {...riskForm.register('title')}
                error={riskForm.formState.errors.title?.message}
                placeholder="Inondation zone industrielle"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...riskForm.register('description')}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Description détaillée du risque..."
                />
                {riskForm.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {riskForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    {...riskForm.register('category')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    {Object.values(RiskCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {riskForm.formState.errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {riskForm.formState.errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sévérité
                  </label>
                  <select
                    {...riskForm.register('severity')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Sélectionner</option>
                    {Object.values(RiskSeverity).map((sev) => (
                      <option key={sev} value={sev}>{sev}</option>
                    ))}
                  </select>
                  {riskForm.formState.errors.severity && (
                    <p className="mt-1 text-sm text-red-600">
                      {riskForm.formState.errors.severity.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  {...riskForm.register('latitude', { valueAsNumber: true })}
                  error={riskForm.formState.errors.latitude?.message}
                  placeholder="48.8566"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  {...riskForm.register('longitude', { valueAsNumber: true })}
                  error={riskForm.formState.errors.longitude?.message}
                  placeholder="2.3522"
                />
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                💡 <strong>Astuce :</strong> Utilisez{' '}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  Google Maps
                </a>
                {' '}pour obtenir les coordonnées GPS précises
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingRisk ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filtres */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="all">Toutes les catégories</option>
                {Object.values(RiskCategory).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sévérité
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="all">Toutes les sévérités</option>
                {Object.values(RiskSeverity).map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Liste des risques */}
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4">
            {filteredRisks.map((risk) => (
              <Card key={risk.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{risk.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {risk.category}
                      </span>
                    </div>
                    {risk.description && (
                      <p className="text-gray-600 text-sm mb-2">{risk.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📍 {risk.latitude.toFixed(4)}, {risk.longitude.toFixed(4)}</span>
                      <span>📅 {new Date(risk.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(risk)}>
                      Modifier
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => deleteRisk(risk.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {filteredRisks.length === 0 && (
              <Card className="p-12 text-center text-gray-500">
                Aucun risque trouvé
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
     </div>
  </AuthLayout>
  );
}
