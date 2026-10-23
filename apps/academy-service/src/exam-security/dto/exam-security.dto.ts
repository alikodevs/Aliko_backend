export class StartExamSessionDto {
  exerciseId: number;
  idPhotoUrl?: string;      // Gov photo ID capture
  webcamSnapUrl?: string;   // Live webcam verification
  ipAddress?: string;
  userAgent?: string;
  honorCodeAccepted: boolean;
}

export class RecordTabBlurDto {
  sessionId: number;
}

export class EndExamSessionDto {
  sessionId: number;
  score?: number;
}

export class AuditExamSessionDto {
  sessionId: number;
  isAudited: boolean;
}
