import { Course, CourseDomain } from '@prisma/client/academy';

export interface HealthComplianceProfile {
  requiredTheoryHours: number;
  requiredLabHours: number;
  requiredClinicalHours: number;
  maxWindowDays: number;
  minQuizPassPercent: number;
  requiresOrientationGate: boolean;
  requiresAdmissionsAgreement: boolean;
}

export const DEFAULT_HEALTH_COMPLIANCE_PROFILE: HealthComplianceProfile = {
  requiredTheoryHours: 35,
  requiredLabHours: 33,
  requiredClinicalHours: 40,
  maxWindowDays: 90,
  minQuizPassPercent: 80,
  requiresOrientationGate: true,
  requiresAdmissionsAgreement: true,
};

/**
 * Central policy helper that separates Health/WABON-regulated courses
 * (CourseDomain.HEALTH) from standard self-paced/cohort courses (CourseDomain.GENERAL).
 */
export class HealthCompliancePolicy {
  static isHealthCourse(course?: Pick<Course, 'domain'> | { domain?: CourseDomain | string } | null): boolean {
    if (!course) return false;
    return course.domain === CourseDomain.HEALTH || course.domain === 'HEALTH';
  }

  static getComplianceProfile(
    course?: { domain?: CourseDomain | string; complianceProfile?: any } | null,
  ): HealthComplianceProfile | null {
    if (!this.isHealthCourse(course)) return null;
    const raw = (course?.complianceProfile && typeof course.complianceProfile === 'object')
      ? course.complianceProfile
      : {};
    return {
      ...DEFAULT_HEALTH_COMPLIANCE_PROFILE,
      ...raw,
    };
  }
}
