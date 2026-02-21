// src/lib/api/tenants.ts
import { apiClient } from './client';

export interface SubscriptionStatus {
  isValid: boolean;
  subscriptionEnd: string | null;
  daysRemaining: number;
}

export interface TenantInfo {
  companyName: string;
  contactEmail: string;
  contactPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  siren?: string | null;
  legalStatus?: string;
  contactName?: string;
  vatMention?: string;
  logoBase64?: string;
}

export interface RiskCategory {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string | null;
  position: number;
}

export interface CreateRiskCategoryInput {
  name: string;
  label: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface UpdateRiskCategoryInput {
  label?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export const tenantsApi = {
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    const response = await apiClient.get('/tenants/subscription-status');
    return response.data;
  },

  getTenantInfo: async (): Promise<TenantInfo> => {
    const response = await apiClient.get('/tenants/me');
    return response.data;
  },

  updateMe: async (data: Partial<TenantInfo>): Promise<TenantInfo> => {
    const response = await apiClient.put('/tenants/me', data);
    return response.data;
  },

  // ✅ Catégories de risques
  getRiskCategories: async (): Promise<RiskCategory[]> => {
    const response = await apiClient.get('/tenants/risk-categories');
    return response.data;
  },

  createRiskCategory: async (data: CreateRiskCategoryInput): Promise<RiskCategory> => {
    const response = await apiClient.post('/tenants/risk-categories', data);
    return response.data;
  },

  updateRiskCategory: async (id: string, data: UpdateRiskCategoryInput): Promise<RiskCategory> => {
    const response = await apiClient.put(`/tenants/risk-categories/${id}`, data);
    return response.data;
  },

  deleteRiskCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenants/risk-categories/${id}`);
  },
};