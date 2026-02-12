import { z } from 'zod';
import { UserRole, RiskCategory, RiskSeverity } from '@/types';

// Validation email
export const emailSchema = z.string().email('Email invalide');

// Validation mot de passe
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Le mot de passe ne peut dépasser 128 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Ancien mot de passe requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.nativeEnum(UserRole),
  tenantId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
});

// Tenant schemas
export const createTenantSchema = z.object({
  companyName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  contactEmail: emailSchema,
  contactPhone: z.string().optional(),
  offerId: z.string().uuid('Offre invalide'),
  subscriptionEnd: z.string().optional(),
});

export const createTenantAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// ✅ Schema pour la modification d'un tenant (AVEC LES DATES)
export const updateTenantSchema = z.object({
  companyName: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  contactEmail: z.string().email('Email invalide'),
  contactPhone: z.string().optional(),
  offerId: z.string().uuid('ID d\'offre invalide'),
  // ✅ IMPORTANT : Ajouter les champs de dates
  subscriptionStart: z.string().optional(),
  subscriptionEnd: z.string().optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;


// Offer schemas
export const createOfferSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  maxUsers: z.number().min(1, 'Le nombre maximum d\'utilisateurs doit être supérieur à 0'),
  price: z.number().min(0, 'Le prix doit être positif'),
  endOfSale: z.string().optional(),
});

// Risk schemas
export const createRiskSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(255),
  description: z.string().optional(),
  category: z.nativeEnum(RiskCategory),
  severity: z.nativeEnum(RiskSeverity),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  metadata: z.record(z.any()).optional(),
});

export const updateRiskSchema = createRiskSchema.partial();

export const nearbyRisksSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_km: z.number().min(0.1).max(100).optional(),
  limit: z.number().min(1).max(200).optional(),
});

// Trial request schema
export const trialRequestSchema = z.object({
  companyName: z.string().min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères'),
  email: emailSchema,
  phone: z.string().regex(/^[+]?[0-9\s\-().]{8,20}$/, 'Format de téléphone invalide').optional(),
  message: z.string().optional(),
});

// Export types inférés
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CreateTenantAdminInput = z.infer<typeof createTenantAdminSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;
export type NearbyRisksInput = z.infer<typeof nearbyRisksSchema>;
export type TrialRequestInput = z.infer<typeof trialRequestSchema>;
