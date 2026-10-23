export class RegisterInstructorCredentialDto {
  rnLicenseNumber: string;
  rnLicenseExpiration: string; // ISO date
  yearsLongTermCareExp: number;
  trainTheTrainerCertUrl?: string;
  wabonApprovalLetterUrl?: string;
}

export class UpdateInstructorCredentialDto {
  rnLicenseNumber?: string;
  rnLicenseExpiration?: string;
  yearsLongTermCareExp?: number;
  trainTheTrainerCertUrl?: string;
  wabonApprovalLetterUrl?: string;
}

export class ApproveInstructorDto {
  instructorUserId: string;
}
