import { IsString, IsNotEmpty, IsNumber, IsObject } from 'class-validator';

export class CreateContractDto {
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  contractFile: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsObject()
  @IsNotEmpty()
  changeOrders: object;
}
