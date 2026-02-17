// src/lib/stores/subscription.ts
import { create } from 'zustand';
import { tenantsApi, SubscriptionStatus } from '@/lib/api/tenants';

interface SubscriptionStore {
  status: SubscriptionStatus | null;
  loading: boolean;
  fetch: () => Promise<void>;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  status: null,
  loading: true,

  fetch: async () => {
    // Évite un double appel si déjà chargé
    if (get().status !== null) return;
    try {
      const data = await tenantsApi.getSubscriptionStatus();
      set({ status: data, loading: false });
    } catch {
      // En cas d'erreur on ne bloque pas l'accès
      set({ status: { isValid: true, subscriptionEnd: null, daysRemaining: 999 }, loading: false });
    }
  },

  reset: () => set({ status: null, loading: true }),
}));
