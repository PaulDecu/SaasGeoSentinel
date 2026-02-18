import { IsString, IsNumber, IsPositive, IsOptional, Max, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99999.99)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;
}
