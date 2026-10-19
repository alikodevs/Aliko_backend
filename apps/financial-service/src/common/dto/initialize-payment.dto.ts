import { IsNumber, IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { PaymentProvider } from '@prisma/client/financial';

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
