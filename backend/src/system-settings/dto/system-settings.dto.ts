// src/system-settings/dto/system-settings.dto.ts
import { IsEnum, IsInt, Min, Max, IsString, IsOptional, MaxLength } from 'class-validator';
import { TourneeType } from '../entities/system-settings.entity';

export class UpdateSystemSettingDto {
  @IsInt()
  @Min(1)
  @Max(60)
  apiCallDelayMinutes: number;

  @IsInt()
  @Min(5)
  @Max(300)
  positionTestDelaySeconds: number;

  @IsInt()
  @Min(1)
  @Max(50)
  riskLoadZoneKm: number;

  @IsInt()
  @Min(10)
  @Max(1000)
  alertRadiusMeters: number;
}

export class UpdateDashboardMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Le message ne peut pas dépasser 500 caractères' })
  dashboardMessage?: string | null;
}

export class SystemSettingResponseDto {
  id: string;
  tourneeType: TourneeType;
  label: string;
  apiCallDelayMinutes: number;
  positionTestDelaySeconds: number;
  riskLoadZoneKm: number;
  alertRadiusMeters: number;
  dashboardMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}
