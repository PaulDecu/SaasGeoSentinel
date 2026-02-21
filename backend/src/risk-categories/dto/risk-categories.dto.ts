import { IsString, IsOptional, IsHexColor, IsInt, Min, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateRiskCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9_-]+$/, { message: 'name doit être en minuscules sans espaces (ex: naturel, mon_type)' })
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  label: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color doit être une couleur hex valide ex: #10B981' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateRiskCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color doit être une couleur hex valide ex: #10B981' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
