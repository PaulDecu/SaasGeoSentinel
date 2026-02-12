import apiClient from './client';
import {
  User,
  LoginCredentials,
  AuthResponse,
  ChangePasswordData,
} from '@/types';

// Auth endpoints
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/auth/reset-password', { token, password });
    return data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh');
    return data;
  },
};

// Profile endpoints
export const profileApi = {
  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/me');
    return data;
  },

  changePassword: async (passwords: ChangePasswordData): Promise<void> => {
    await apiClient.post('/me/change-password', passwords);
  },
};
