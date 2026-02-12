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

  // ✅ NOUVEAU : Dates d'abonnement modifiables
  @IsDateString()
  @IsOptional()
  subscriptionStart?: string;

  @IsDateString()
  @IsOptional()
  subscriptionEnd?: string;
}

export class CreateTenantAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}