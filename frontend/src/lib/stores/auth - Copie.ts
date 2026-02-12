import { create } from 'zustand';
import { User, LoginCredentials } from '@/types';
import { authApi, profileApi } from '@/lib/api/auth';
import { setAccessToken } from '@/lib/api/client';

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
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials) => {
    const response = await authApi.login(credentials);
    setAccessToken(response.accessToken);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignorer les erreurs de logout
    } finally {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: async () => {
    try {
      set({ isLoading: true });
      const user = await profileApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      setAccessToken(null);
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
