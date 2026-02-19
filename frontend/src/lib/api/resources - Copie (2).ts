import apiClient from './client';
import { User, Tenant, Offer, Risk, Subscription, SubscriptionStats, RenewSubscriptionRequest } from '@/types';

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

  // NOUVELLES MÉTHODES AJOUTÉES
  getSubscriptionStatus: async (): Promise<{
    isValid: boolean;
    subscriptionEnd: string | null;
    daysRemaining: number;
  }> => {
    const { data } = await apiClient.get('/tenants/subscription-status');
    return data;
  },

  updateMe: async (data: {
    companyName?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    siren?: string;
  }): Promise<any> => {
    const { data: res } = await apiClient.put('/tenants/me', data);
    return res;
  },

  getTenantInfo: async (): Promise<{
    companyName: string;
    contactEmail: string;
    contactPhone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    siren?: string | null;
  }> => {
    const { data } = await apiClient.get('/tenants/me');
    return data;
  },
};

// Offers API
export const offersApi = {
  // Récupérer toutes les offres (SUPERADMIN uniquement)
  getAll: async (): Promise<Offer[]> => {
    const { data } = await apiClient.get<Offer[]>('/offers');
    return data;
  },

  // Récupérer les offres disponibles (ADMIN autorisé - pour renouvellement)
  getAvailable: async (): Promise<Offer[]> => {
    const { data } = await apiClient.get<Offer[]>('/offers/available');
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

  update: async (id: string, userData: Partial<User>): Promise<User> => {
    const { data } = await apiClient.put<User>(`/users/${id}`, userData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/offers/${id}`);
  },
};

// Subscriptions API
export const subscriptionsApi = {
  // Récupérer tous les abonnements de mon tenant
  getMySubscriptions: async (): Promise<Subscription[]> => {
    const { data } = await apiClient.get<Subscription[]>('/subscriptions/my-tenant');
    return data;
  },

  // Récupérer l'abonnement actif
  getActive: async (): Promise<Subscription | null> => {
    const { data } = await apiClient.get<Subscription | null>('/subscriptions/active');
    return data;
  },

  // Récupérer les statistiques
  getStats: async (): Promise<SubscriptionStats> => {
    const { data } = await apiClient.get<SubscriptionStats>('/subscriptions/stats');
    return data;
  },

  // Récupérer un abonnement spécifique par ID
  getOne: async (id: string): Promise<Subscription> => {
    const { data } = await apiClient.get<Subscription>(`/subscriptions/${id}`);
    return data;
  },

  // ✅ NOUVELLE MÉTHODE : Récupérer un abonnement par son functional_id
  getByFunctionalId: async (functionalId: string): Promise<Subscription> => {
    const { data } = await apiClient.get<Subscription>(`/subscriptions/functional/${functionalId}`);
    return data;
  },

  // Renouveler l'abonnement
  renew: async (renewData: RenewSubscriptionRequest): Promise<Subscription> => {
    const { data } = await apiClient.post<Subscription>('/subscriptions/renew', renewData);
    return data;
  },

  // ✅ NOUVELLES MÉTHODES pour SuperAdmin
  // Rechercher des abonnements par functional_id
  searchByFunctionalId: async (functionalId: string): Promise<Subscription[]> => {
    const { data } = await apiClient.get<Subscription[]>(`/subscriptions/search/functional/${functionalId}`);
    return data;
  },

  // Obtenir tous les abonnements avec pagination
  getAllWithPagination: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    subscriptions: Subscription[];
    total: number;
    pages: number;
    currentPage: number;
  }> => {
    const { data } = await apiClient.get('/subscriptions/all', { params });
    return data;
  },

  // ✅ NOUVELLE MÉTHODE : Créer un abonnement manuellement (SuperAdmin)
  createManual: async (tenantId: string, subscriptionData: {
    offerId: string;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    paymentMethod?: string;
    paymentAmount: number;
    offerName: string;
    daysSubscribed: number;
    metadata?: Record<string, any>;
  }): Promise<Subscription> => {
    const { data } = await apiClient.post<Subscription>(`/subscriptions/create/${tenantId}`, subscriptionData);
    return data;
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

// Dans resources.ts
export const paymentsApi = {
  create: async (data: { offerId: string; paymentMethod: string; amount: number; description: string; subscriptionId?: string }) => {
    const { data: res } = await apiClient.post('/payments', data);
    return res as { checkoutUrl: string; paymentId: string };
  },
  getStatus: async (paymentId: string) => {
    const { data: res } = await apiClient.get(`/payments/${paymentId}/status`);
    return res as { status: string };
  },
};