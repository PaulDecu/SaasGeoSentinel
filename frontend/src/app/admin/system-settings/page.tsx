// src/app/admin/system-settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { systemSettingsApi, SystemSetting, UpdateSystemSettingDto } from '@/lib/api/system-settings';

export default function SystemSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<UpdateSystemSettingDto>>({});
  const [error, setError] = useState<string | null>(null);
  
  // ✅ État pour le message du dashboard
  const [dashboardMessage, setDashboardMessage] = useState<string>('');
  const [editingMessage, setEditingMessage] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setError(null);
      const data = await systemSettingsApi.getAll();
      setSettings(data);
      
      // Charger le message du dashboard
      if (data.length > 0 && data[0].dashboardMessage) {
        setDashboardMessage(data[0].dashboardMessage);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      
      if (error.response?.status === 403) {
        setError('Accès interdit : réservé au superadmin');
        setTimeout(() => router.push('/'), 2000);
      } else {
        setError(error.response?.data?.message || 'Erreur lors du chargement des paramètres');
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: SystemSetting) => {
    setEditMode(setting.id);
    setEditValues({
      apiCallDelayMinutes: setting.apiCallDelayMinutes,
      positionTestDelaySeconds: setting.positionTestDelaySeconds,
      riskLoadZoneKm: setting.riskLoadZoneKm,
      alertRadiusMeters: setting.alertRadiusMeters,
    });
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditValues({});
  };

  const saveEdit = async (id: string) => {
    setSaving(id);
    setError(null);
    
    try {
      await systemSettingsApi.update(id, editValues as UpdateSystemSettingDto);
      await loadSettings();
      setEditMode(null);
      setEditValues({});
    } catch (error: any) {
      console.error('Erreur:', error);
      setError(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(null);
    }
  };

  // ✅ Sauvegarder le message du dashboard
  const saveDashboardMessage = async () => {
    setSavingMessage(true);
    setError(null);
    
    try {
      await systemSettingsApi.updateDashboardMessage(dashboardMessage || null);
      setEditingMessage(false);
      await loadSettings();
    } catch (error: any) {
      console.error('Erreur:', error);
      setError(error.response?.data?.message || 'Erreur lors de la sauvegarde du message');
    } finally {
      setSavingMessage(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pieds': return '🚶';
      case 'velo': return '🚴';
      case 'voiture': return '🚗';
      default: return '📍';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Paramètres Système</h1>
        <p className="text-gray-600 mt-2">
          Configuration des paramètres de géolocalisation par type de tournée
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Erreur :</strong> {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NOUVEAU: Section Message Dashboard */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-lg shadow-md p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📢 Message Dashboard Global
            </h2>
            <p className="text-purple-100 text-sm mt-1">
              Ce message sera affiché sur le dashboard de tous les utilisateurs
            </p>
          </div>
          {editingMessage ? (
            <div className="flex gap-2">
              <button
                onClick={saveDashboardMessage}
                disabled={savingMessage}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {savingMessage ? 'Sauvegarde...' : '✓ Sauvegarder'}
              </button>
              <button
                onClick={() => {
                  setEditingMessage(false);
                  setDashboardMessage(settings[0]?.dashboardMessage || '');
                }}
                disabled={savingMessage}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                ✕ Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingMessage(true)}
              className="bg-white text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-semibold"
            >
              ✏️ Modifier
            </button>
          )}
        </div>

        <div className="bg-white/10 rounded-lg p-4">
          {editingMessage ? (
            <textarea
              value={dashboardMessage}
              onChange={(e) => setDashboardMessage(e.target.value)}
              placeholder="Entrez un message pour tous les utilisateurs (laissez vide pour ne rien afficher)"
              className="w-full px-3 py-2 border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 text-gray-900 min-h-[100px]"
              maxLength={500}
            />
          ) : (
            <div className="text-white">
              {dashboardMessage ? (
                <p className="text-lg">{dashboardMessage}</p>
              ) : (
                <p className="text-purple-200 italic">Aucun message configuré</p>
              )}
            </div>
          )}
          <p className="text-purple-100 text-xs mt-2">
            {dashboardMessage.length} / 500 caractères
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">ℹ️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Important :</strong> Ces paramètres affectent le comportement de toutes les applications mobiles.
              Les modifications sont appliquées immédiatement après sauvegarde.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="space-y-6">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getIcon(setting.tourneeType)}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{setting.label}</h2>
                  <p className="text-blue-100 text-sm">Type : {setting.tourneeType}</p>
                </div>
              </div>
              {editMode === setting.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(setting.id)}
                    disabled={saving === setting.id}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {saving === setting.id ? 'Sauvegarde...' : '✓ Sauvegarder'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving === setting.id}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    ✕ Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(setting)}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold"
                >
                  ✏️ Modifier
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Délai API */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⏱️ Délai d'appel API
                  </label>
                  {editMode === setting.id ? (
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={editValues.apiCallDelayMinutes || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        apiCallDelayMinutes: parseInt(e.target.value),
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {setting.apiCallDelayMinutes} min
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Fréquence appel nearby</p>
                </div>

                {/* Délai test position */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📍 Test de position
                  </label>
                  {editMode === setting.id ? (
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={editValues.positionTestDelaySeconds || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        positionTestDelaySeconds: parseInt(e.target.value),
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {setting.positionTestDelaySeconds} sec
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Fréquence GPS</p>
                </div>

                {/* Zone chargement */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🗺️ Zone de chargement
                  </label>
                  {editMode === setting.id ? (
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={editValues.riskLoadZoneKm || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        riskLoadZoneKm: parseInt(e.target.value),
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {setting.riskLoadZoneKm} km
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Rayon recherche risques</p>
                </div>

                {/* Rayon alerte */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🚨 Rayon d'alerte
                  </label>
                  {editMode === setting.id ? (
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={editValues.alertRadiusMeters || ''}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        alertRadiusMeters: parseInt(e.target.value),
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">
                      {setting.alertRadiusMeters} m
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Distance notification</p>
                </div>
              </div>

              {/* Dernière modification */}
              <div className="mt-4 text-xs text-gray-500 text-right">
                Dernière modification : {new Date(setting.updatedAt).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📖 Documentation</h3>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <strong>Délai d'appel API (1-60 min) :</strong> Fréquence à laquelle l'app mobile
            appelle l'API pour rafraîchir la liste des risques à proximité.
          </div>
          <div>
            <strong>Test de position (5-300 sec) :</strong> Fréquence à laquelle l'app vérifie
            la position GPS de l'utilisateur en arrière-plan.
          </div>
          <div>
            <strong>Zone de chargement (1-50 km) :</strong> Rayon dans lequel les risques sont
            chargés depuis l'API. Un rayon plus grand consomme plus de données.
          </div>
          <div>
            <strong>Rayon d'alerte (10-1000 m) :</strong> Distance à laquelle une notification
            est envoyée à l'utilisateur lorsqu'il approche d'un risque.
          </div>
          <div>
            <strong>Message Dashboard :</strong> Message global affiché sur le dashboard de tous
            les utilisateurs (maximum 500 caractères).
          </div>
        </div>
      </div>
    </div>
  );
}
