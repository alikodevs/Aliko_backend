import { IsNumber, IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { PaymentProvider } from '../../generated/client';

export class InitializePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
