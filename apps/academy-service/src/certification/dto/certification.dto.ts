export class GenerateCertificateDto {
  cohortId: number;
  userId?: string;
  directorName?: string;
  directorRnLicense?: string;
}

export class VerifyCertificateDto {
  certificateNumber: string;
}
