/// <reference types="jest" />
import { AttendanceService } from './attendance.service';
import { AuthenticatedUser } from '../user/user.service';

describe('AttendanceService (WAC 246-841A-440 Req 12)', () => {
  let service: AttendanceService;
  let prisma: any;
  let userService: any;

  const mockInstructor: AuthenticatedUser = {
    firebaseId: 'inst-001',
    email: 'instructor@alikohub.com',
    firstname: 'Florence',
    lastname: 'Nightingale',
    role: 'INSTRUCTOR',
    status: 'ACTIVE',
  };

  const mockCourse = {
    id: 10,
    title: 'Nursing Assistant Certified Hybrid Program',
    instructorId: 'inst-001',
    outcomes: [
      'Understand Nursing Assistant scope of practice under Washington Law',
      'Demonstrate standard precautions and infection control',
    ],
    modules: [
      {
        id: 1,
        title: 'Module 1: Role of the Nursing Assistant & Healthcare Law',
        exercises: [
          {
            id: 101,
            moduleId: 1,
            title: 'Scope of Practice & Mandatory Abuse Reporting Analysis',
            type: 'SHORT_TEXT',
            points: 10,
            isWeekOneAttendanceGate: true,
            courseOutcome:
              'Understand Nursing Assistant scope of practice under Washington Law',
            description:
              'Analyze the clinical boundary scenario and identify reportable events.',
          },
        ],
        discussionTopics: [
          {
            id: 201,
            moduleId: 1,
            title: 'Week 1 Clinical Ethics & Patient Autonomy Discussion',
            maxPoints: 10,
            isWeekOneAttendanceGate: true,
            courseOutcome:
              'Understand Nursing Assistant scope of practice under Washington Law',
            prompt: 'Reflect on resident rights and consent in memory care units.',
          },
        ],
      },
    ],
  };

  const mockCohort = {
    id: 5,
    name: 'Fall 2026 NA-C Cohort A',
    courseId: 10,
    course: mockCourse,
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Day 3 of cohort
    endDate: new Date(Date.now() + 87 * 24 * 60 * 60 * 1000),
    assignedInstructorIds: ['inst-001'],
  };

  const mockEnrollments = [
    {
      id: 501,
      userId: 'student-001',
      cohortId: 5,
      courseId: 10,
      enrolledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      attendanceStatus: 'VERIFIED_PRESENT',
      attendanceVerifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      attendanceVerifiedBy: 'AUTO_ASSIGNMENT_101',
      attendanceNotes: 'Verified via Week 1 Attendance Gate Exercise',
      cohort: mockCohort,
      profile: { userId: 'student-001', role: 'STUDENT' },
    },
    {
      id: 502,
      userId: 'student-002',
      cohortId: 5,
      courseId: 10,
      enrolledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      attendanceStatus: 'PENDING_VERIFICATION',
      attendanceVerifiedAt: null,
      attendanceVerifiedBy: null,
      attendanceNotes: null,
      cohort: mockCohort,
      profile: { userId: 'student-002', role: 'STUDENT' },
    },
  ];

  beforeEach(() => {
    prisma = {
      cohort: {
        findUnique: jest.fn().mockResolvedValue(mockCohort),
      },
      course: {
        findUnique: jest.fn().mockResolvedValue(mockCourse),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue(mockEnrollments),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          const found = mockEnrollments.find((e) => e.id === where.id);
          return Promise.resolve(found ? { ...found, course: mockCourse } : null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          const existing = mockEnrollments.find((e) => e.id === where.id) || {};
          return Promise.resolve({ ...existing, ...data });
        }),
      },
      exerciseSubmission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 991,
            userId: 'student-001',
            exerciseId: 101,
            score: 10,
            isCorrect: true,
            status: 'GRADED',
            exercise: mockCourse.modules[0].exercises[0],
          },
        ]),
      },
      discussionPost: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    userService = {
      getOrCreateProfile: jest.fn().mockResolvedValue({
        userId: 'inst-001',
        role: 'INSTRUCTOR',
      }),
      getUsersByIds: jest.fn().mockResolvedValue([
        {
          firebaseId: 'student-001',
          firstname: 'Almaz',
          lastname: 'Haile',
          email: 'almaz@example.com',
        },
        {
          firebaseId: 'student-002',
          firstname: 'Dawit',
          lastname: 'Tadesse',
          email: 'dawit@example.com',
        },
      ]),
    };

    service = new AttendanceService(prisma, userService);
  });

  it('1. Generates Week 1 Attendance Census Dossier complying with WAC Req 12', async () => {
    const report = await service.getWeekOneAttendanceReport(
      { cohortId: 5 },
      mockInstructor,
    );

    expect(report).toBeDefined();
    expect(report.statutoryCitation).toBe('WAC 246-841A-440 Requirement 12');
    expect(report.gateAssignmentsConfigured.totalGateExercises).toBe(1);
    expect(
      report.gateAssignmentsConfigured.exercises[0].courseOutcome,
    ).toContain('scope of practice');
    expect(report.summaryMetrics.totalEnrolled).toBe(2);
    expect(report.summaryMetrics.verifiedPresent).toBe(1);
    expect(report.summaryMetrics.pendingVerification).toBe(1);
    expect(report.summaryMetrics.complianceRatePercent).toBe(50);
    expect(report.roster[0].attendanceStatus).toBe('VERIFIED_PRESENT');
    expect(report.roster[0].qualifyingEvidence).toBeDefined();
  });

  it('2. Retrieves designated gate assignments and course outcomes for course', async () => {
    const gateInfo = await service.getGateAssignment(10);

    expect(gateInfo.hasGateAssignment).toBe(true);
    expect(gateInfo.gateExercises.length).toBe(1);
    expect(gateInfo.gateExercises[0].courseOutcome).toBe(
      'Understand Nursing Assistant scope of practice under Washington Law',
    );
    expect(gateInfo.gateDiscussions.length).toBe(1);
  });

  it('3. Runs cohort Day 7 census sweep and flags overdue students as NO_SHOW_AT_RISK', async () => {
    // Set cohort start date 8 days in past (past Day 7 deadline)
    const expiredCohort = {
      ...mockCohort,
      startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    };
    prisma.cohort.findUnique.mockResolvedValue(expiredCohort);
    prisma.enrollment.findMany.mockResolvedValue([
      {
        id: 502,
        userId: 'student-002',
        attendanceStatus: 'PENDING_VERIFICATION',
      },
    ]);

    const result = await service.runCohortCensus(5, mockInstructor, 'Census day 7 cutoff');

    expect(result.flaggedAsNoShowAtRisk).toBe(1);
    expect(result.flaggedStudentIds).toContain('student-002');
    expect(prisma.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 502 },
        data: expect.objectContaining({
          attendanceStatus: 'NO_SHOW_AT_RISK',
        }),
      }),
    );
  });

  it('4. Allows instructor or admin to override attendance status with audit notes', async () => {
    const updated = await service.overrideAttendance(
      502,
      {
        status: 'VERIFIED_PRESENT',
        notes: 'Verified via in-person synchronous skills checkoff during Week 1',
      },
      mockInstructor,
    );

    expect(updated.attendanceStatus).toBe('VERIFIED_PRESENT');
    expect(prisma.enrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 502 },
        data: expect.objectContaining({
          attendanceStatus: 'VERIFIED_PRESENT',
          attendanceVerifiedBy: 'MANUAL_OVERRIDE_inst-001',
          attendanceNotes:
            'Verified via in-person synchronous skills checkoff during Week 1',
        }),
      }),
    );
  });
});
