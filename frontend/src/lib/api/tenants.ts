// src/lib/api/tenants.ts
import { apiClient } from './client';

export interface SubscriptionStatus {
  isValid: boolean;
  subscriptionEnd: string | null;
  daysRemaining: number;
}

export const tenantsApi = {
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    const response = await apiClient.get('/tenants/subscription-status');
    return response.data;
  },
};
