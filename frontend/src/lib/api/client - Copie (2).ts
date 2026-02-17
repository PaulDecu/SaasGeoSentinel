import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { AuthResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Instance Axios principale
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Pour les cookies httpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gestion du token en localStorage (fallback si pas de cookies)
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

// Intercepteur de réponses : gérer 401 et refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Si erreur 401 et pas déjà en train de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Ne pas tenter de refresh sur les endpoints auth (login, logout, refresh...)
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');
      // Ne pas tenter de refresh si le logout est en cours (cookie déjà effacé)
      const isLogoutEndpoint = originalRequest.url?.includes('/auth/logout');
      if (isAuthEndpoint || isLogoutEndpoint) {
        // Si c'est un logout qui échoue, nettoyer quand même le token local
        if (isLogoutEndpoint) {
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Mettre en queue si refresh en cours
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tenter de refresh le token
        const response = await apiClient.post<AuthResponse>('/auth/refresh');
        const { accessToken: newToken } = response.data;

        setAccessToken(newToken);
        processQueue(null, newToken);

        // Retry la requête originale
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh échoué : déconnecter l'utilisateur
        processQueue(refreshError, null);
        setAccessToken(null);
        
        // Rediriger vers login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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