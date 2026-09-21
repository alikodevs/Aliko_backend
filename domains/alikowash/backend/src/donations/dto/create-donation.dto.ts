export class CreateDonationDto {
  donorName: string;
  email: string;
  country?: string;
  amount: number;
  currency: string = "USD";
  message?: string;
  status: string = "pending";
}

export class UpdateDonationDto {
  status: string;
}
