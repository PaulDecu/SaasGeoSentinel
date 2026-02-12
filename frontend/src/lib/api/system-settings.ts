// src/lib/api/system-settings.ts
import { apiClient } from './client';

export interface SystemSetting {
  id: string;
  tourneeType: 'pieds' | 'velo' | 'voiture';
  label: string;
  apiCallDelayMinutes: number;
  positionTestDelaySeconds: number;
  riskLoadZoneKm: number;
  alertRadiusMeters: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSystemSettingDto {
  apiCallDelayMinutes: number;
  positionTestDelaySeconds: number;
  riskLoadZoneKm: number;
  alertRadiusMeters: number;
}

export const systemSettingsApi = {
  // Récupérer tous les paramètres (SUPERADMIN only)
  getAll: async (): Promise<SystemSetting[]> => {
    const response = await apiClient.get('/system-settings');
    return response.data;
  },

  // Récupérer un paramètre par ID (SUPERADMIN only)
  getById: async (id: string): Promise<SystemSetting> => {
    const response = await apiClient.get(`/system-settings/${id}`);
    return response.data;
  },

  // Mettre à jour un paramètre (SUPERADMIN only)
  update: async (id: string, data: UpdateSystemSettingDto): Promise<SystemSetting> => {
    const response = await apiClient.put(`/system-settings/${id}`, data);
    return response.data;
  },

  // Récupérer tous les paramètres (route publique, tous les utilisateurs)
  getAllPublic: async (): Promise<SystemSetting[]> => {
    const response = await apiClient.get('/system-settings/public/all');
    return response.data;
  },
};
