import { create } from 'zustand';
import { User, LoginCredentials } from '@/types';
import { authApi, profileApi } from '@/lib/api/auth';
import { setAccessToken } from '@/lib/api/client';
import { useSubscriptionStore } from '@/lib/stores/subscription';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (credentials) => {
    const response = await authApi.login(credentials);
    setAccessToken(response.accessToken);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    // Vider le token local en premier pour bloquer tout appel authentifié
    setAccessToken(null);
    try {
      await authApi.logout();
    } catch {
      // Ignorer toutes les erreurs (token expiré, réseau, etc.)
    } finally {
      useSubscriptionStore.getState().reset();
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const user = await profileApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Échec du chargement de l'utilisateur:", error);
      set({ user: null, isAuthenticated: false, isLoading: false });
      setAccessToken(null);
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));