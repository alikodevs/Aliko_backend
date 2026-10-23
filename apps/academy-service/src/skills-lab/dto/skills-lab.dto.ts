export class CreateCoreSkillDto {
  skillNumber: string; // e.g. "SKILL-01"
  name: string;
  category: string; // Infection Control, Vitals, Hygiene, Restorative, etc.
  steps: any; // JSON: step-by-step critical criteria
}

export class RecordSkillCheckoffDto {
  skillId: number;
  studentUserId: string;
  cohortId: number;
  passed: boolean;
  attempts?: number;
  comments?: string;
}

export class UpdateSkillCheckoffDto {
  passed?: boolean;
  attempts?: number;
  comments?: string;
}
