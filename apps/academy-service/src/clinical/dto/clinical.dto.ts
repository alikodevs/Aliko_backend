export class CreateClinicalShiftDto {
  cohortId: number;
  facilityName: string;
  shiftDate: string; // ISO date
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  hoursCredited: number;
}

export class RecordClinicalAttendanceDto {
  shiftId: number;
  studentUserId: string;
  hoursCompleted: number;
  competencyNotes?: string;
  passed?: boolean;
}

export class UpdateClinicalAttendanceDto {
  hoursCompleted?: number;
  competencyNotes?: string;
  passed?: boolean;
}
