import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RiskCategory, RiskSeverity } from '../entities/risk.enums';
import { Type } from 'class-transformer';

export class CreateRiskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RiskCategory)
  @IsNotEmpty()
  category: RiskCategory;

  @IsEnum(RiskSeverity)
  @IsNotEmpty()
  severity: RiskSeverity;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateRiskDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RiskCategory)
  @IsOptional()
  category?: RiskCategory;

  @IsEnum(RiskSeverity)
  @IsOptional()
  severity?: RiskSeverity;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class FindNearbyRisksDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  @IsOptional()
  radius_km?: number = 10;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 200;
}
