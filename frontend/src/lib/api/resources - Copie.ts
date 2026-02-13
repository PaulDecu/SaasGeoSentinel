import apiClient from './client';
import { User, Tenant, Offer, Risk } from '@/types';

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  getOne: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },

  create: async (userData: {
    email: string;
    password: string;
    role: string;
    tenantId?: string;
  }): Promise<User> => {
    const { data } = await apiClient.post<User>('/users', userData);
    return data;
  },

  update: async (id: string, userData: Partial<User>): Promise<User> => {
    const { data } = await apiClient.put<User>(`/users/${id}`, userData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  bulkDelete: async (userIds: string[]): Promise<{
    success: string[];
    errors: Array<{ userId: string; error: string }>;
  }> => {
    const { data } = await apiClient.post('/users/bulk-delete', { userIds });
    return data;
  },
};

// Tenants API
export const tenantsApi = {
  getAll: async (): Promise<Tenant[]> => {
    const { data } = await apiClient.get<Tenant[]>('/tenants');
    return data;
  },

  getOne: async (id: string): Promise<Tenant> => {
    const { data } = await apiClient.get<Tenant>(`/tenants/${id}`);
    return data;
  },

  create: async (tenantData: {
    companyName: string;
    contactEmail: string;
    contactPhone?: string;
    offerId: string;
    subscriptionEnd?: string;
    metadata?: Record<string, any>;
  }): Promise<Tenant> => {
    const { data } = await apiClient.post<Tenant>('/tenants', tenantData);
    return data;
  },

  update: async (id: string, tenantData: Partial<Tenant>): Promise<Tenant> => {
    const { data } = await apiClient.put<Tenant>(`/tenants/${id}`, tenantData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tenants/${id}`);
  },

  createAdmin: async (tenantId: string, adminData: {
    email: string;
    password: string;
  }): Promise<User> => {
    const { data } = await apiClient.post<User>(`/tenants/${tenantId}/admins`, adminData);
    return data;
  },
};

// Offers API
export const offersApi = {
  getAll: async (): Promise<Offer[]> => {
    const { data } = await apiClient.get<Offer[]>('/offers');
    return data;
  },

  getOne: async (id: string): Promise<Offer> => {
    const { data } = await apiClient.get<Offer>(`/offers/${id}`);
    return data;
  },

  create: async (offerData: {
    name: string;
    maxUsers: number;
    price: number;
    trialPeriodDays?: number;
    endOfSale?: string;
  }): Promise<Offer> => {
    const { data } = await apiClient.post<Offer>('/offers', offerData);
    return data;
  },

  update: async (id: string, offerData: {
    name?: string;
    price?: number;
    endOfSale?: string;
  }): Promise<Offer> => {
    const { data } = await apiClient.put<Offer>(`/offers/${id}`, offerData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/offers/${id}`);
  },
};

// Risks API
export const risksApi = {
  getAll: async (): Promise<Risk[]> => {
    const { data } = await apiClient.get<Risk[]>('/risks');
    return data;
  },

  getOne: async (id: string): Promise<Risk> => {
    const { data } = await apiClient.get<Risk>(`/risks/${id}`);
    return data;
  },

  create: async (riskData: {
    title: string;
    description?: string;
    category: string;
    severity: string;
    latitude: number;
    longitude: number;
    metadata?: Record<string, any>;
  }): Promise<Risk> => {
    const { data } = await apiClient.post<Risk>('/risks', riskData);
    return data;
  },

  update: async (id: string, riskData: Partial<Risk>): Promise<Risk> => {
    const { data } = await apiClient.put<Risk>(`/risks/${id}`, riskData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/risks/${id}`);
  },

  findNearby: async (params: {
    lat: number;
    lng: number;
    radius_km?: number;
    limit?: number;
  }): Promise<Risk[]> => {
    const { data } = await apiClient.get<Risk[]>('/risks/nearby', { params });
    return data;
  },
};