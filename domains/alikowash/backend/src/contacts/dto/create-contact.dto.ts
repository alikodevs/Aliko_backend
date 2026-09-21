export class CreateContactDto {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  country?: string;
  serviceInterest?: string;
  message: string;
  sourcePage?: string;
}
