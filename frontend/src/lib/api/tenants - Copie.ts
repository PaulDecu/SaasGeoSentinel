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
  // Champs additionnels pour la facturation
  legalStatus?: string;
  contactName?: string;
  vatMention?: string;
  logoBase64?: string;
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
};