export class CreateProjectDto {
  title: string;
  location: string;
  yearGc?: string;
  systemType?: string;
  capacityM3?: number;
  tags?: string[];
  summary?: string;
  description?: string;
  photos?: string[];
  partnerNames?: string[];
  displayOrder?: number;
  isPublished?: boolean;
}
