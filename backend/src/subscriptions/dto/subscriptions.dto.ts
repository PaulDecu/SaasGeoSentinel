import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  IsObject,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  offerId: string;

  @IsDateString()
  @IsNotEmpty()
  subscriptionStartDate: string;

  @IsDateString()
  @IsNotEmpty()
  subscriptionEndDate: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  paymentAmount: number;

  @IsString()
  @IsNotEmpty()
  offerName: string;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  daysSubscribed: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RenewSubscriptionDto {
  @IsUUID()
  @IsNotEmpty()
  offerId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SubscriptionResponseDto {
  id: string;
  tenantId: string;
  paymentDate: Date;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  paymentMethod: string;
  paymentAmount: number;
  offerName: string;
  offerId: string;
  daysSubscribed: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  
  // Informations enrichies (optionnelles)
  offer?: {
    id: string;
    name: string;
    price: number;
    maxUsers: number;
    trialPeriodDays: number;
  };
}