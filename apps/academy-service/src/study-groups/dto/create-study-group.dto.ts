export class CreateStudyGroupDto {
  cohortId: number;
  name: string;
  description?: string;
  meetingUrl?: string; // Zoom / Google Meet / Jitsi link
}
