/**
 * FR-10: Seed the WABON / WAC 246-841A Regulated CNA (NA-C) Health Course Curriculum
 * Includes Module 0 (Orientation Gate O-1..O-9, non-credit),
 * Units 1-9 (10-lesson unit flow with Pyramid, Story, Discussion, Quiz, and KEY video unlock rules),
 * and Modules 10-12 (Skills Lab 33h, Clinical 40h, Final Program Completion).
 *
 * Usage:
 *   npx ts-node --transpile-only -r dotenv/config -r tsconfig-paths/register scripts/seed_wabons_curriculum.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  PrismaClient,
  CourseDomain,
  CourseStatus,
  CurriculumTrack,
  LessonType,
  ExerciseType,
} from '@prisma/client/academy';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl =
  process.env.DATABASE_URL_ACADEMY ||
  (process.env.ACADEMY_DATABASE_URL
    ? process.env.ACADEMY_DATABASE_URL.replace('@postgres:', '@127.0.0.1:')
    : undefined) ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const UNITS = [
  { unitNumber: 1, title: 'Unit 1: The Nursing Assistant & Care Team', guidePages: 'pp. 1-24', theoryHours: 4.0, labHours: 2.0, characters: ['Maria', 'Mr. Johnson'] },
  { unitNumber: 2, title: 'Unit 2: Infection Control & Safety', guidePages: 'pp. 25-52', theoryHours: 4.0, labHours: 4.0, characters: ['Nurse Elena', 'Mrs. Chen'] },
  { unitNumber: 3, title: 'Unit 3: Communication & Resident Rights', guidePages: 'pp. 53-78', theoryHours: 4.0, labHours: 2.0, characters: ['David', 'Mr. Alvarez'] },
  { unitNumber: 4, title: 'Unit 4: Vital Signs & Observation', guidePages: 'pp. 79-106', theoryHours: 4.0, labHours: 5.0, characters: ['Nurse Priya', 'Ms. Brooks'] },
  { unitNumber: 5, title: 'Unit 5: Positioning, Mobility & Transfers', guidePages: 'pp. 107-134', theoryHours: 4.0, labHours: 5.0, characters: ['Carlos', 'Mr. Thompson'] },
  { unitNumber: 6, title: 'Unit 6: Personal Care & Hygiene (ADLs)', guidePages: 'pp. 135-168', theoryHours: 4.0, labHours: 5.0, characters: ['Aisha', 'Mrs. Patel'] },
  { unitNumber: 7, title: 'Unit 7: Nutrition, Hydration & Elimination', guidePages: 'pp. 169-196', theoryHours: 4.0, labHours: 4.0, characters: ['Sam', 'Mr. Okafor'] },
  { unitNumber: 8, title: 'Unit 8: Dementia, Mental Health & Special Care', guidePages: 'pp. 197-224', theoryHours: 3.5, labHours: 3.0, characters: ['Grace', 'Mrs. Kowalski'] },
  { unitNumber: 9, title: 'Unit 9: Emergencies, End-of-Life & Exam Prep', guidePages: 'pp. 225-252', theoryHours: 3.5, labHours: 3.0, characters: ['Team Review'] },
];

async function main() {
  const instructor = await prisma.academyProfile.findFirst({
    where: { role: { in: ['INSTRUCTOR', 'ADMIN'] } },
  });
  if (!instructor) {
    throw new Error('No INSTRUCTOR or ADMIN AcademyProfile found. Run seed:users first.');
  }

  let course = await prisma.course.findFirst({
    where: { title: 'Washington Nursing Assistant Certified (NA-C) Program', domain: CourseDomain.HEALTH },
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        title: 'Washington Nursing Assistant Certified (NA-C) Program',
        shortDescription: 'WABON / WAC 246-841A-440 approved 108-hour Nursing Assistant training program.',
        longDescription: 'Trimodal Nursing Assistant Certified (NA-C) curriculum: 35h asynchronous/synchronous theory, 33h in-person skills lab, and 40h supervised clinical practicum.',
        category: 'Healthcare & Nursing',
        domain: CourseDomain.HEALTH,
        regulatoryBody: 'WABON',
        complianceProfile: {
          requiredTheoryHours: 35,
          requiredLabHours: 33,
          requiredClinicalHours: 40,
          maxWindowDays: 90,
          minQuizPassPercent: 80,
          requiresOrientationGate: true,
          requiresAdmissionsAgreement: true,
        },
        instructorId: instructor.userId,
        status: CourseStatus.PUBLISHED,
        isStateApproved: true,
        estimatedTime: 108,
        targetLevel: 'Beginner',
        languages: ['English'],
      },
    });
  }

  const existingModules = await prisma.module.count({ where: { courseId: course.id } });
  if (existingModules > 0) {
    console.log(`Course ${course.id} already has ${existingModules} modules. Skipping duplicate curriculum seed.`);
    return;
  }

  // Module 0: Orientation (9 non-credit items)
  const mod0 = await prisma.module.create({
    data: {
      courseId: course.id,
      title: 'Module 0: Program Orientation & Onboarding',
      description: 'Non-credit mandatory orientation gate (O-1 through O-9) under WAC 246-841A-440.',
      track: CurriculumTrack.THEORY_ASYNC,
      isOrientationModule: true,
      unitNumber: 0,
      targetTheoryHours: 0,
      targetLabHours: 0,
    },
  });

  const orientationLessons = [
    { title: 'O-1: Live Welcome Session (Instructor Sign-Off)', type: LessonType.LIVE },
    { title: 'O-2: Program Rules & Attendance Policy', type: LessonType.TEXT },
    { title: 'O-3: Your Schedule & 90-Day Statutory Window', type: LessonType.TEXT },
    { title: 'O-4: Using the LMS & Practice Quiz', type: LessonType.QUIZ },
    { title: 'O-5: Online Conduct & Academic Integrity', type: LessonType.SIGNATURE },
    { title: 'O-6: How This Course Works', type: LessonType.VIDEO },
    { title: 'O-7: Lab & Clinical Expectations', type: LessonType.READING },
    { title: 'O-8: Technology Check (Webcam, Mic & Browser)', type: LessonType.CHECKLIST },
    { title: 'O-9: Sign Enrollment Agreement', type: LessonType.SIGNATURE },
  ];

  for (let i = 0; i < orientationLessons.length; i++) {
    await prisma.lesson.create({
      data: {
        moduleId: mod0.id,
        title: orientationLessons[i].title,
        type: orientationLessons[i].type,
        order: i + 1,
        isOrientationLesson: true,
        isCreditHour: false,
        estimatedHours: 0,
      },
    });
  }

  // Units 1-9 (10 lessons per unit + Pyramid, Story, Discussion, Proctored Quiz)
  for (const u of UNITS) {
    const mod = await prisma.module.create({
      data: {
        courseId: course.id,
        title: u.title,
        description: `WABON Unit ${u.unitNumber} (${u.guidePages})`,
        track: CurriculumTrack.THEORY_ASYNC,
        isOrientationModule: false,
        unitNumber: u.unitNumber,
        targetTheoryHours: u.theoryHours,
        targetLabHours: u.labHours,
        studentGuidePages: u.guidePages,
        characters: u.characters,
      },
    });

    const pyramidEx = await prisma.exercise.create({
      data: {
        moduleId: mod.id,
        type: ExerciseType.MASLOW_PYRAMID,
        title: `${u.unitNumber}-2a: Maslow Pyramid Activity`,
        question: `Categorize the Unit ${u.unitNumber} resident care needs across the 5 Maslow hierarchy levels.`,
        points: 20,
        order: 1,
      },
    });

    const storyEx = await prisma.exercise.create({
      data: {
        moduleId: mod.id,
        type: ExerciseType.STORY_ACTIVITY,
        title: `${u.unitNumber}-3a: Resident Story Activity`,
        question: `Analyze the clinical scenario featuring ${u.characters.join(' & ')} and document your care response.`,
        points: 20,
        order: 2,
      },
    });

    await prisma.exercise.create({
      data: {
        moduleId: mod.id,
        type: ExerciseType.MULTIPLE_CHOICE,
        title: `${u.unitNumber}-9: Proctored Unit ${u.unitNumber} Quiz`,
        question: `Unit ${u.unitNumber} Competency Assessment (80% passing required)`,
        options: [
          { id: 'q1', prompt: 'Sample competency question 1', choices: ['A', 'B', 'C', 'D'] },
          { id: 'q2', prompt: 'Sample competency question 2', choices: ['A', 'B', 'C', 'D'] },
        ],
        correctAnswer: 'A',
        points: 100,
        isProctored: true,
        passingScorePercent: 80,
        poolSize: 10,
        order: 3,
      },
    });

    await prisma.discussionTopic.create({
      data: {
        moduleId: mod.id,
        title: `${u.unitNumber}-7: Unit ${u.unitNumber} Reflection Discussion`,
        prompt: `Share your key clinical takeaway from Unit ${u.unitNumber} and respond to at least 2 peers.`,
        maxPoints: 10,
        postFirst: true,
        minReplies: 2,
        isWeekOneAttendanceGate: u.unitNumber === 1,
      },
    });

    const unitLessons = [
      { title: `${u.unitNumber}-1: Unit Overview & Student Guide (${u.guidePages})`, type: LessonType.READING, unlockRules: null },
      { title: `${u.unitNumber}-2: Maslow Pyramid Activity`, type: LessonType.ASSIGNMENT, unlockRules: null },
      { title: `${u.unitNumber}-2 KEY: Pyramid Answer Video`, type: LessonType.VIDEO, unlockRules: { prerequisites: [{ type: 'EXERCISE_SUBMISSION', id: pyramidEx.id }] } },
      { title: `${u.unitNumber}-3: Resident Story Activity`, type: LessonType.ASSIGNMENT, unlockRules: null },
      { title: `${u.unitNumber}-3 KEY: Story Answer Video`, type: LessonType.VIDEO, unlockRules: { prerequisites: [{ type: 'EXERCISE_SUBMISSION', id: storyEx.id }] } },
      { title: `${u.unitNumber}-4: Core Theory Video Lecture`, type: LessonType.VIDEO, unlockRules: null },
      { title: `${u.unitNumber}-5: Textbook Reading & Crosswalk`, type: LessonType.READING, unlockRules: null },
      { title: `${u.unitNumber}-6: Live Q&A / Practice Session`, type: LessonType.LIVE, unlockRules: null },
      { title: `${u.unitNumber}-7: Post-First Unit Discussion`, type: LessonType.DISCUSSION, unlockRules: null },
      { title: `${u.unitNumber}-9: Proctored Unit Quiz`, type: LessonType.QUIZ, unlockRules: null },
    ];

    for (let i = 0; i < unitLessons.length; i++) {
      await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          title: unitLessons[i].title,
          type: unitLessons[i].type,
          order: i + 1,
          isCreditHour: true,
          estimatedHours: Number((u.theoryHours / 10).toFixed(2)),
          isWeekOneAttendanceGate: u.unitNumber === 1 && unitLessons[i].type === LessonType.DISCUSSION,
          unlockRules: unitLessons[i].unlockRules ?? undefined,
        },
      });
    }
  }

  // Modules 10-12 (Skills Lab, Clinical, Final Completion)
  const capModules = [
    { unitNumber: 10, title: 'Module 10: In-Person Skills Lab (33 Hours)', track: CurriculumTrack.SKILLS_LAB_IN_PERSON, lessonType: LessonType.SKILLS, theoryHours: 0, labHours: 33 },
    { unitNumber: 11, title: 'Module 11: Supervised Clinical Practicum (40 Hours)', track: CurriculumTrack.CLINICAL_IN_PERSON, lessonType: LessonType.CLINICAL, theoryHours: 0, labHours: 0 },
    { unitNumber: 12, title: 'Module 12: Course Evaluation & State Certification', track: CurriculumTrack.THEORY_ASYNC, lessonType: LessonType.CHECKLIST, theoryHours: 0, labHours: 0 },
  ];

  for (const cm of capModules) {
    const m = await prisma.module.create({
      data: {
        courseId: course.id,
        title: cm.title,
        description: `${cm.title} — WAC 246-841A-440 requirement`,
        track: cm.track,
        unitNumber: cm.unitNumber,
        targetTheoryHours: cm.theoryHours,
        targetLabHours: cm.labHours,
      },
    });
    await prisma.lesson.create({
      data: {
        moduleId: m.id,
        title: `${cm.title} Checklist`,
        type: cm.lessonType,
        order: 1,
        isCreditHour: cm.unitNumber !== 12,
        estimatedHours: cm.labHours,
      },
    });
  }

  console.log(`Seeded WABON HEALTH course (ID=${course.id}) with Module 0, Units 1-9, and Modules 10-12.`);
}

main()
  .catch((err) => {
    console.error('Failed to seed WABON curriculum:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
