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
  trialPeriodDays: number;
  endOfSale: string | null;
  createdAt: string;
  updatedAt: string;
}

// Types risque — RiskCategory enum supprimé, remplacé par catégories dynamiques par tenant

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
  creatorEmail?: string;
  title: string;
  description: string | null;
  // ✅ category remplacé par categoryId (FK) + champs dénormalisés
  categoryId: string;
  category?: string;        // name technique ex: 'naturel' (dénormalisé)
  categoryLabel?: string;   // libellé affiché ex: 'Naturel'
  categoryColor?: string;   // couleur hex ex: '#10B981'
  categoryIcon?: string;    // emoji ex: '🌪️'
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

// ============================================
// Types pour les Abonnements (Subscriptions)
// ============================================

export interface Subscription {
  id: string;
  tenantId: string;
  functionalId: string; // ✅ Identifiant fonctionnel au format GS-00000000x
  paymentDate: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  paymentMethod: string;
  paymentAmount: number;
  offerName: string;
  offerId: string;
  daysSubscribed: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  offer?: Offer;
}

export interface SubscriptionStats {
  totalSubscriptions: number;
  totalAmountPaid: number;
  totalDaysSubscribed: number;
  hasActiveSubscription: boolean;
  activeSubscription: Subscription | null;
}

export interface RenewSubscriptionRequest {
  offerId: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}