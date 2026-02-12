// Types utilisateur
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  GESTIONNAIRE = 'gestionnaire',
  UTILISATEUR = 'utilisateur',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenant?: Tenant;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Types tenant
export interface Tenant {
  id: string;
  publicId: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string | null;
  offerId: string;
  offer?: Offer;
  subscriptionStart: string;
  subscriptionEnd: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Types offre
export interface Offer {
  id: string;
  name: string;
  maxUsers: number;
  price: number;
  endOfSale: string | null;
  createdAt: string;
  updatedAt: string;
}

// Types risque
export enum RiskCategory {
  NATUREL = 'naturel',
  INDUSTRIEL = 'industriel',
  SANITAIRE = 'sanitaire',
  TECHNOLOGIQUE = 'technologique',
  SOCIAL = 'social',
  AUTRE = 'autre',
}

export enum RiskSeverity {
  FAIBLE = 'faible',
  MODERE = 'modéré',
  ELEVE = 'élevé',
  CRITIQUE = 'critique',
}

export interface Risk {
  id: string;
  tenantId: string;
  createdByUserId: string;
creatorEmail?: string; // <-- Ajout de cette propriété
  title: string;
  description: string | null;
  category: RiskCategory;
  severity: RiskSeverity;
  latitude: number;
  longitude: number;
  distance?: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Types auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

// Types API
export interface ApiError {
  message: string | string[];
  error: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
