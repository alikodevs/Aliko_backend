export class CreatePartnerDto {
  orgName: string;
  orgFullName?: string;
  role?: string;
  category?: string;
  logoUrl?: string;
  websiteUrl?: string;
  displayOrder?: number;
  isPublished?: boolean;
}
