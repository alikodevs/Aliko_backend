import { IsEnum, IsNotEmpty } from "class-validator";

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export class UpdateDonationStatusDto {
  @IsEnum(DonationStatus)
  @IsNotEmpty()
  status: DonationStatus;
}
