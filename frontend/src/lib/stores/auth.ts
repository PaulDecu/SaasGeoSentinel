import { create } from 'zustand';
import { User, LoginCredentials } from '@/types';
import { authApi, profileApi } from '@/lib/api/auth';
import { setAccessToken } from '@/lib/api/client';
import { useSubscriptionStore } from '@/lib/stores/subscription';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasAttemptedLoad: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  hasAttemptedLoad: false,

  login: async (credentials) => {
    const response = await authApi.login(credentials);
    setAccessToken(response.accessToken);
    set({ user: response.user, isAuthenticated: true, hasAttemptedLoad: true });
  },

  logout: async () => {
    setAccessToken(null);
    try {
      await authApi.logout();
    } catch {
      // Ignorer toutes les erreurs (token expiré, réseau, etc.)
    } finally {
      useSubscriptionStore.getState().reset();
      set({ user: null, isAuthenticated: false, hasAttemptedLoad: false });
    }
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      console.log('🔄 loadUser appelé');
      const user = await profileApi.getProfile();
      console.log('✅ user chargé:', user);
      set({ user, isAuthenticated: true, isLoading: false, hasAttemptedLoad: true });
    } catch (error) {
      console.error("Échec du chargement de l'utilisateur:", error);
      set({ user: null, isAuthenticated: false, isLoading: false, hasAttemptedLoad: true });
      setAccessToken(null);
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
