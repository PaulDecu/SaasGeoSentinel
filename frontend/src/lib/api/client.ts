import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { AuthResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Instance Axios principale
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gestion du token en localStorage
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
};

export const getAccessToken = (): string | null => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
};

// Intercepteur de requêtes : ajouter le token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponses : sur 401, rediriger vers /login sans tenter de refresh
// Le refresh automatique causait une boucle infinie (refresh → 401 → refresh → ...)
// car le cookie refreshToken n'était pas transmis en cross-origin avec sameSite=strict
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = (error.config as AxiosRequestConfig)?.url ?? '';

      // Ne rediriger que si ce n'est pas déjà une page d'auth
      const isAuthPage =
        url.includes('/auth/login') ||
        url.includes('/auth/logout') ||
        url.includes('/auth/refresh');

      if (!isAuthPage) {
        setAccessToken(null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Helpers pour les erreurs API
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    const message = error.response.data.message;
    return Array.isArray(message) ? message.join(', ') : message;
  }
  return error.message || 'Une erreur est survenue';
};

export default apiClient;