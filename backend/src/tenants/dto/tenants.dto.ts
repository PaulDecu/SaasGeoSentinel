import { IsString, IsEmail, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  companyName: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsUUID()
  offerId: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  siren?: string;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsUUID()
  @IsOptional()
  offerId?: string;

  @IsDateString()
  @IsOptional()
  subscriptionStart?: string;

  @IsDateString()
  @IsOptional()
  subscriptionEnd?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  siren?: string;
}

export class CreateTenantAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

// ✅ NOUVEAU : DTO pour la mise à jour du profil entreprise par l'admin du tenant
// Ne permet PAS de modifier contactEmail, offerId, subscriptionStart/End
export class UpdateMyTenantDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  siren?: string;
}
