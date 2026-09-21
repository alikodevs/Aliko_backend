export class CreateTeamMemberDto {
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
  displayOrder?: number = 0;
  isPublished?: boolean = true;
}

export class UpdateTeamMemberDto {
  name?: string;
  role?: string;
  bio?: string;
  photoUrl?: string;
  displayOrder?: number;
  isPublished?: boolean;
}
