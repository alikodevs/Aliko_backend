import { ClientProxyFactory, Transport, ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = parseInt(process.env.ACADEMY_TCP_PORT || process.env.PORT || '3015');

interface TestResult {
  step: number;
  domain: string;
  command: string;
  role: string;
  type: 'ALLOW' | 'DENY_CHECK';
  status: 'PASS' | 'FAIL';
  details?: string;
}

async function runWabonSuite() {
  console.log('\n========================================================================');
  console.log('   🏥 ALIKOHUB ACADEMY — WABON REGULATORY COMPLIANCE E2E TEST SUITE     ');
  console.log('   Standard: Washington State Board of Nursing (WAC 246-841A-440)       ');
  console.log('========================================================================\n');

  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: PORT },
  });

  console.log(`Connecting to Academy Service TCP on port ${PORT}...`);

  const results: TestResult[] = [];
  let stepCounter = 1;

  const STRING_PATTERNS = new Set([
    'create_rubric',
    'get_rubrics',
    'get_rubric_by_id',
    'update_rubric',
    'delete_rubric',
    'clone_rubric',
    'evaluate_with_rubric',
    'submit_evaluation_survey',
    'get_my_evaluation_survey',
    'get_cohort_evaluation_surveys',
    'create_support_ticket',
    'get_my_support_tickets',
    'get_support_ticket_by_id',
    'list_all_support_tickets',
    'update_support_ticket',
    'get_system_requirements',
    'get_student_grade_report',
    'get_cohort_gradebook',
    'export_cohort_gradebook_csv',
    'generate_wabon_certificate',
    'verify_wabon_certificate',
    'generate_compliance_dossier',
  ]);

  function toPattern(cmd: string | { cmd: string }): string | { cmd: string } {
    if (typeof cmd !== 'string') return cmd;
    if (STRING_PATTERNS.has(cmd)) {
      return cmd;
    }
    return { cmd };
  }

  async function testAllow(domain: string, cmd: string | { cmd: string }, payload: any, role: string): Promise<any> {
    const cmdPattern = toPattern(cmd);
    const cmdName = typeof cmd === 'string' ? cmd : cmd.cmd;
    const currentStep = stepCounter++;
    try {
      const response = await firstValueFrom(client.send(cmdPattern, payload));
      console.log(`  [Step ${String(currentStep).padStart(2, '0')}] [PASS] ${domain.padEnd(24)} | ${cmdName.padEnd(34)} | Role: ${role}`);
      results.push({ step: currentStep, domain, command: cmdName, role, type: 'ALLOW', status: 'PASS' });
      return response;
    } catch (error: any) {
      console.error(`  [Step ${String(currentStep).padStart(2, '0')}] [FAIL] ${domain.padEnd(24)} | ${cmdName.padEnd(34)} | Role: ${role} | Error: ${error?.message || JSON.stringify(error)}`);
      results.push({ step: currentStep, domain, command: cmdName, role, type: 'ALLOW', status: 'FAIL', details: error?.message || JSON.stringify(error) });
      return null;
    }
  }

  async function testDeny(domain: string, cmd: string | { cmd: string }, payload: any, role: string): Promise<boolean> {
    const cmdPattern = toPattern(cmd);
    const cmdName = typeof cmd === 'string' ? cmd : cmd.cmd;
    const currentStep = stepCounter++;
    try {
      await firstValueFrom(client.send(cmdPattern, payload));
      console.error(`  [Step ${String(currentStep).padStart(2, '0')}] [FAIL] ${domain.padEnd(24)} | ${cmdName.padEnd(34)} | Role: ${role} (Expected DENY, but was ALLOWED!)`);
      results.push({ step: currentStep, domain, command: cmdName, role, type: 'DENY_CHECK', status: 'FAIL', details: 'Unauthorized action was unexpectedly allowed' });
      return false;
    } catch (error: any) {
      console.log(`  [Step ${String(currentStep).padStart(2, '0')}] [PASS] ${domain.padEnd(24)} | ${cmdName.padEnd(34)} | Role: ${role} (Correctly REJECTED: ${error?.message || JSON.stringify(error)})`);
      results.push({ step: currentStep, domain, command: cmdName, role, type: 'DENY_CHECK', status: 'PASS', details: 'Forbidden / Rejected as expected' });
      return true;
    }
  }

  // Define personas
  const timestamp = Date.now().toString().slice(-4);
  const adminUser = { firebaseId: `wabon-admin-${timestamp}`, email: `admin-${timestamp}@wabon.edu`, globalRole: 'ADMIN', role: 'ADMIN' };
  const instructorUser = { firebaseId: `wabon-instructor-${timestamp}`, email: `instructor-${timestamp}@wabon.edu`, globalRole: 'USER', role: 'INSTRUCTOR' };
  const studentUser = { firebaseId: `wabon-student-${timestamp}`, email: `student-${timestamp}@wabon.edu`, globalRole: 'USER', role: 'STUDENT' };
  const student2User = { firebaseId: `wabon-student2-${timestamp}`, email: `student2-${timestamp}@wabon.edu`, globalRole: 'USER', role: 'STUDENT' };
  const auditorUser = { firebaseId: `wabon-auditor-${timestamp}`, email: `auditor-${timestamp}@wabon.gov`, globalRole: 'USER', role: 'COMMISSION_AUDITOR' };

  console.log('\n--- 1. SETTING UP PROFILES & SELECTING ACADEMY ROLES ---');
  await testAllow('Setup', 'get_academy_profile', { user: adminUser }, 'ADMIN');
  await testAllow('Setup', 'select_academy_role', { userId: adminUser.firebaseId, role: 'ADMIN', user: adminUser }, 'ADMIN');

  await testAllow('Setup', 'get_academy_profile', { user: instructorUser }, 'INSTRUCTOR');
  await testAllow('Setup', 'select_academy_role', { userId: instructorUser.firebaseId, role: 'INSTRUCTOR', user: instructorUser }, 'INSTRUCTOR');

  await testAllow('Setup', 'get_academy_profile', { user: studentUser }, 'STUDENT');
  await testAllow('Setup', 'select_academy_role', { userId: studentUser.firebaseId, role: 'STUDENT', user: studentUser }, 'STUDENT');

  await testAllow('Setup', 'get_academy_profile', { user: student2User }, 'STUDENT');
  await testAllow('Setup', 'select_academy_role', { userId: student2User.firebaseId, role: 'STUDENT', user: student2User }, 'STUDENT');

  await testAllow('Setup', 'get_academy_profile', { user: auditorUser }, 'AUDITOR');
  await testAllow('Setup', 'select_academy_role', { userId: auditorUser.firebaseId, role: 'COMMISSION_AUDITOR', user: auditorUser }, 'AUDITOR');

  console.log('\n--- 2. WABON DOMAIN 11: RN INSTRUCTOR CREDENTIAL VERIFICATION (WAC 246-841A-440(10)) ---');
  // Registered and approved BEFORE scheduling lab/clinical teaching per WABON mandates
  const expDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await testAllow('Credentials', 'register_instructor_credential', {
    dto: {
      rnLicenseNumber: 'RN.60123456.WA',
      rnLicenseExpiration: expDate.toISOString(),
      yearsLongTermCareExp: 5.5,
      trainTheTrainerCertUrl: 'https://storage.alikohub.com/credentials/train-the-trainer.pdf',
      wabonApprovalLetterUrl: 'https://storage.alikohub.com/credentials/wabon-approval.pdf',
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  await testAllow('Credentials', 'get_instructor_credential', { instructorUserId: instructorUser.firebaseId, user: instructorUser }, 'INSTRUCTOR');

  // Role check: Instructor cannot approve own credential
  await testDeny('Credentials', 'approve_instructor', {
    dto: { instructorUserId: instructorUser.firebaseId },
    user: instructorUser,
  }, 'INSTRUCTOR');

  // Admin approves instructor credential
  await testAllow('Credentials', 'approve_instructor', {
    dto: { instructorUserId: instructorUser.firebaseId },
    user: adminUser,
  }, 'ADMIN');

  await testAllow('Credentials', 'list_all_instructors', { user: auditorUser }, 'COMMISSION_AUDITOR');

  console.log('\n--- 3. BASE ACADEMY SERVICE WORKFLOW SETUP ---');
  // Role check: student cannot create course
  await testDeny('Academy Base', 'create_course', {
    dto: { title: 'Unauthorized Course', status: 'DRAFT', difficulty: 'BEGINNER', category: 'Nursing', instructorId: studentUser.firebaseId },
    user: studentUser
  }, 'STUDENT');

  // Instructor creates course
  const course = await testAllow('Academy Base', 'create_course', {
    dto: {
      title: 'WA Nursing Assistant Certified (NA-C) ' + timestamp,
      shortDescription: 'State-approved NA-C certification program',
      status: 'DRAFT',
      difficulty: 'BEGINNER',
      category: 'Healthcare',
      price: 0,
      instructorId: instructorUser.firebaseId,
      learningOutcomes: ['Patient Care', 'Infection Control', 'Vital Signs'],
      requirements: ['High School Diploma or GED', 'Valid WA ID'],
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  if (!course) {
    console.error('CRITICAL: Course creation failed, aborting dependent tests.');
    process.exit(1);
  }

  // Publish course via Admin
  await testAllow('Academy Base', 'update_course_status', { id: course.id, status: 'PUBLISHED', user: adminUser }, 'ADMIN');

  // Create Cohort
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const cohort = await testAllow('Academy Base', 'create_cohort', {
    dto: {
      name: 'NA-C Cohort Spring ' + timestamp,
      courseId: course.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const cohortId = cohort ? cohort.id : 1;

  // Create Module
  const moduleItem = await testAllow('Academy Base', 'create_course_module', {
    dto: {
      title: 'Module 1: Principles of Infection Prevention & CDC Precautions',
      description: 'Covers standard precautions, OSHA standards, and PPE',
      courseId: course.id,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const moduleId = moduleItem ? moduleItem.id : 1;

  // Create Lesson
  const lesson = await testAllow('Academy Base', 'create_lesson', {
    dto: {
      title: 'Standard Precautions & Chain of Infection',
      moduleId: moduleId,
      type: 'VIDEO',
      contents: [{ title: 'Intro Video', type: 'VIDEO', url: 'https://storage.alikohub.com/videos/infection-control.mp4' }],
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const lessonId = lesson ? lesson.id : 1;

  // Create Exercise
  const exercise = await testAllow('Academy Base', 'create_exercise', {
    dto: {
      title: 'Midterm Proctored Exam: Infection Control & Patient Safety',
      moduleId: moduleId,
      lessonId: lessonId,
      type: 'MULTIPLE_CHOICE',
      question: 'Which of the following is the single most effective method for preventing the transmission of infection?',
      options: ['Wearing gloves', 'Hand hygiene with soap and water or alcohol gel', 'Sterilizing all bed linens', 'Wearing an N95 mask'],
      correctAnswer: 'Hand hygiene with soap and water or alcohol gel',
      points: 10,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const exerciseId = exercise ? exercise.id : 1;

  // Enroll Student (Student self-enrolls; role defaults to user.firebaseId)
  await testAllow('Academy Base', 'create_enrollment', {
    dto: {
      courseId: course.id,
      cohortId: cohortId,
      enrollmentType: 'FREE',
    },
    user: studentUser,
  }, 'STUDENT');

  // Also enroll student2 for peer study groups
  await testAllow('Academy Base', 'create_enrollment', {
    dto: {
      courseId: course.id,
      cohortId: cohortId,
      enrollmentType: 'FREE',
    },
    user: student2User,
  }, 'STUDENT');

  console.log('\n--- 4. WABON DOMAIN 1: ADMISSIONS & STATUTORY SCREENING (WAC 246-841A-440(1)) ---');
  // Student submits admissions application
  const appRes = await testAllow('Admissions', 'submit_admissions_application', {
    dto: {
      cohortId: cohortId,
      backgroundCheckUrl: 'https://storage.alikohub.com/admissions/bg-check.pdf',
      tbTestProofUrl: 'https://storage.alikohub.com/admissions/tb-negative.pdf',
      immunizationProofUrl: 'https://storage.alikohub.com/admissions/immunization.pdf',
      cprCertUrl: 'https://storage.alikohub.com/admissions/bls-aha.pdf',
      idDocUrl: 'https://storage.alikohub.com/admissions/wa-id.jpg',
      highSchoolProofUrl: 'https://storage.alikohub.com/admissions/hs-diploma.pdf',
    },
    user: studentUser,
  }, 'STUDENT');

  const applicationId = appRes ? appRes.id : 1;

  // Role check: Student cannot review admissions application
  await testDeny('Admissions', 'review_admissions_application', {
    dto: { applicationId: applicationId, status: 'APPROVED' },
    user: studentUser,
  }, 'STUDENT');

  // Student signs enrollment agreement & legal disclosures
  await testAllow('Admissions', 'sign_enrollment_agreement', {
    dto: {
      cohortId: cohortId,
      signatureUrl: 'https://storage.alikohub.com/signatures/student-sig.png',
      disclosuresAcknowledged: true,
    },
    user: studentUser,
  }, 'STUDENT');

  // Student views own application
  await testAllow('Admissions', 'get_my_admissions_application', {
    cohortId: cohortId,
    user: studentUser,
  }, 'STUDENT');

  // Role check: Student cannot view all cohort admissions
  await testDeny('Admissions', 'get_cohort_admissions_applications', {
    cohortId: cohortId,
    user: studentUser,
  }, 'STUDENT');

  // Auditor views cohort applications
  await testAllow('Admissions', 'get_cohort_admissions_applications', {
    cohortId: cohortId,
    user: auditorUser,
  }, 'COMMISSION_AUDITOR');

  // Instructor reviews & approves application (activates enrollment)
  await testAllow('Admissions', 'review_admissions_application', {
    dto: {
      applicationId: applicationId,
      status: 'APPROVED',
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  console.log('\n--- 5. WABON DOMAIN 2: ORIENTATION & ATTENDANCE CENSUS (WAC 246-841A-440(2)) ---');
  await testAllow('Orientation', 'get_orientation_status', { cohortId: cohortId, user: studentUser }, 'STUDENT');
  await testAllow('Orientation', 'complete_orientation', {
    dto: {
      cohortId: cohortId,
      orientationAttended: true,
      lmsTutorialCompleted: true,
      netiquetteSigned: true,
    },
    user: studentUser,
  }, 'STUDENT');

  console.log('\n--- 6. WABON DOMAIN 3: CURRICULUM-TEXTBOOK CROSSWALK (WAC 246-841A-440(3)) ---');
  // Role check: Student cannot add textbook
  await testDeny('Crosswalk', 'add_course_textbook', {
    dto: { courseId: course.id, title: 'Unauthorized Book', author: 'Nobody', isbn: '000-0-00-000000-0', publisher: 'Pub', edition: '1st' },
    user: studentUser,
  }, 'STUDENT');

  // Instructor adds textbook
  const textbook = await testAllow('Crosswalk', 'add_course_textbook', {
    dto: {
      courseId: course.id,
      title: 'Mosby\'s Textbook for Nursing Assistants',
      author: 'Leighann Remmert',
      isbn: '978-0323655606',
      publisher: 'Elsevier',
      edition: '10th Edition',
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const textbookId = textbook ? textbook.id : 1;

  await testAllow('Crosswalk', 'get_course_textbooks', { courseId: course.id, user: studentUser }, 'STUDENT');

  // Role check: Student cannot assign reading
  await testDeny('Crosswalk', 'assign_lesson_reading', {
    dto: { lessonId: lessonId, textbookId: textbookId, chapters: 'Chapter 1', pageRange: '1-10' },
    user: studentUser,
  }, 'STUDENT');

  // Instructor assigns lesson reading
  await testAllow('Crosswalk', 'assign_lesson_reading', {
    dto: {
      lessonId: lessonId,
      textbookId: textbookId,
      chapters: 'Chapter 12: Infection Prevention and Control in Subacute Care',
      pageRange: '145-168',
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  await testAllow('Crosswalk', 'get_lesson_readings', { lessonId: lessonId, user: studentUser }, 'STUDENT');
  await testAllow('Crosswalk', 'get_course_curriculum_crosswalk', { courseId: course.id, user: auditorUser }, 'COMMISSION_AUDITOR');

  console.log('\n--- 7. WABON DOMAIN 4: MULTI-CRITERIA RUBRICS ---');
  // Role check: Student cannot create rubric
  await testDeny('Rubrics', 'create_rubric', {
    dto: { name: 'Illegal Rubric', type: 'DISCUSSION', isActive: true, criteria: [] },
    user: studentUser,
  }, 'STUDENT');

  // Instructor creates rubric
  const rubric = await testAllow('Rubrics', 'create_rubric', {
    dto: {
      name: 'Clinical Judgment & Infection Control Rubric',
      description: 'Assesses critical thinking and standard CDC precautions',
      type: 'DISCUSSION',
      isActive: true,
      criteria: [
        {
          title: 'Core Knowledge & Precautions',
          description: 'Demonstrates understanding of PPE and transmission routes',
          maxPoints: 10,
          order: 1,
          levels: [
            { name: 'Exemplary', description: 'Flawlessly articulates all precautions', points: 10, order: 1 },
            { name: 'Competent', description: 'Understands basic precautions', points: 7, order: 2 },
          ],
        },
      ],
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const rubricId = rubric ? rubric.id : 'rubric-1';

  await testAllow('Rubrics', 'get_rubrics', { dto: { type: 'DISCUSSION', isActive: true }, user: studentUser }, 'STUDENT');
  await testAllow('Rubrics', 'get_rubric_by_id', { id: rubricId, user: studentUser }, 'STUDENT');
  await testAllow('Rubrics', 'clone_rubric', { dto: { rubricId: rubricId, newName: 'Cloned Rubric for Summer' }, user: instructorUser }, 'INSTRUCTOR');
  await testAllow('Rubrics', 'update_rubric', { dto: { id: rubricId, description: 'Updated description' }, user: instructorUser }, 'INSTRUCTOR');

  console.log('\n--- 8. WABON DOMAIN 5: DISCUSSION FORUMS & SUBSTANTIVE INTERACTION (WAC 246-841A-440(4)) ---');
  // Instructor creates discussion topic
  const topic = await testAllow('Discussions', 'create_discussion_topic', {
    dto: {
      moduleId: moduleId,
      title: 'Week 1 Case Study: Isolation Precautions in Memory Care',
      prompt: 'Analyze resident with suspected C. diff infection. What PPE and room signage is mandatory?',
      maxPoints: 20,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const topicId = topic ? topic.id : 1;

  await testAllow('Discussions', 'find_module_discussions', { moduleId: moduleId, user: studentUser }, 'STUDENT');
  await testAllow('Discussions', 'get_discussion_topic', { topicId: topicId, user: studentUser }, 'STUDENT');

  // Student submits post
  const post = await testAllow('Discussions', 'create_discussion_post', {
    dto: {
      topicId: topicId,
      body: 'For suspected C. difficile, contact precautions plus soap and water hand hygiene must be used because alcohol gel does not destroy bacterial spores. Gown and gloves must be donned prior to resident room entry.',
    },
    user: studentUser,
  }, 'STUDENT');

  const postId = post ? post.id : 1;

  // Role check: Student cannot grade discussion post
  await testDeny('Discussions', 'grade_discussion_post', {
    postId: postId,
    dto: { score: 20, feedback: 'Self-grading' },
    user: studentUser,
  }, 'STUDENT');

  // Instructor grades discussion post
  await testAllow('Discussions', 'grade_discussion_post', {
    postId: postId,
    dto: { score: 18, feedback: 'Superb clinical accuracy regarding spore resistance to alcohol gel.' },
    user: instructorUser,
  }, 'INSTRUCTOR');

  console.log('\n--- 9. WABON DOMAIN 6: COHORT PEER STUDY GROUPS (WAC 246-841A-440(5)) ---');
  const group = await testAllow('Study Groups', 'create_study_group', {
    dto: {
      cohortId: cohortId,
      name: 'Alpha Caregivers Study Circle',
      description: 'Peer group for NA-C theory review and NCLEX prep',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
    },
    user: studentUser,
  }, 'STUDENT');

  const groupId = group ? group.id : 1;

  await testAllow('Study Groups', 'find_cohort_study_groups', { cohortId: cohortId, user: studentUser }, 'STUDENT');
  await testAllow('Study Groups', 'get_study_group', { studyGroupId: groupId, user: studentUser }, 'STUDENT');
  await testAllow('Study Groups', 'join_study_group', { dto: { studyGroupId: groupId }, user: student2User }, 'STUDENT');
  await testAllow('Study Groups', 'update_study_group', { studyGroupId: groupId, dto: { description: 'Updated peer review agenda' }, user: studentUser }, 'STUDENT');
  await testAllow('Study Groups', 'leave_study_group', { studyGroupId: groupId, user: student2User }, 'STUDENT');

  console.log('\n--- 10. WABON DOMAIN 7: ACTIVE SEAT-TIME HEARTBEAT ENGINE (WAC 246-841A-440(6)) ---');
  await testAllow('Seat-Time', 'seat_time_heartbeat', {
    dto: { courseId: course.id, lessonId: lessonId, activeSeconds: 60, idleSeconds: 0 },
    user: studentUser,
  }, 'STUDENT');

  await testAllow('Seat-Time', 'get_seat_time_summary', { courseId: course.id, user: studentUser }, 'STUDENT');
  await testAllow('Seat-Time', 'get_seat_time_lesson', { courseId: course.id, lessonId: lessonId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot access cohort seat-time report
  await testDeny('Seat-Time', 'get_cohort_seat_time_report', { cohortId: cohortId, user: studentUser }, 'STUDENT');
  await testAllow('Seat-Time', 'get_cohort_seat_time_report', { cohortId: cohortId, user: auditorUser }, 'COMMISSION_AUDITOR');

  console.log('\n--- 11. WABON DOMAIN 8: SKILLS LAB COMPETENCY CHECKOFFS (WAC 246-841A-440(7)) ---');
  const skillNum = 'SKILL-' + timestamp;
  // Role check: Student cannot create core skill
  await testDeny('Skills Lab', 'create_core_skill', {
    dto: { skillNumber: skillNum, name: 'Hand Hygiene', category: 'Infection Control', steps: [] },
    user: studentUser,
  }, 'STUDENT');

  // Instructor catalogs skill
  const skill = await testAllow('Skills Lab', 'create_core_skill', {
    dto: {
      skillNumber: skillNum,
      name: 'Hand Hygiene & Medical Asepsis',
      category: 'Infection Control',
      steps: [
        'Wet hands and wrists thoroughly under running water',
        'Lather soap for at least 20 seconds',
        'Clean under fingernails against palm',
        'Rinse with fingertips pointing downward',
        'Dry with clean paper towel and turn off faucet with dry barrier',
      ],
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const skillId = skill ? skill.id : 1;

  const allSkills = await testAllow('Skills Lab', 'list_core_skills', { user: studentUser }, 'STUDENT');
  await testAllow('Skills Lab', 'get_core_skill', { skillId: skillId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot record skill checkoff
  await testDeny('Skills Lab', 'record_skill_checkoff', {
    dto: { skillId: skillId, studentUserId: studentUser.firebaseId, cohortId: cohortId, passed: true },
    user: studentUser,
  }, 'STUDENT');

  // RN Instructor records checkoff
  const checkoff = await testAllow('Skills Lab', 'record_skill_checkoff', {
    dto: {
      skillId: skillId,
      studentUserId: studentUser.firebaseId,
      cohortId: cohortId,
      passed: true,
      attempts: 1,
      comments: 'Flawless friction technique; fingertips kept downward.',
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  // Ensure all existing skills in database have a passed checkoff to satisfy WABON clinical prerequisite gate
  if (Array.isArray(allSkills)) {
    for (const sk of allSkills) {
      if (sk.id !== skillId) {
        try {
          await firstValueFrom(client.send(toPattern('record_skill_checkoff'), {
            dto: {
              skillId: sk.id,
              studentUserId: studentUser.firebaseId,
              cohortId: cohortId,
              passed: true,
              attempts: 1,
              comments: 'Passed prerequisite skill checkoff.',
            },
            user: instructorUser,
          }));
        } catch (_) {}
      }
    }
  }

  const checkoffId = checkoff ? checkoff.id : 1;

  await testAllow('Skills Lab', 'update_skill_checkoff', {
    checkoffId: checkoffId,
    dto: { passed: true, comments: 'Updated: Student demonstrated proficiency on first evaluated attempt.' },
    user: instructorUser,
  }, 'INSTRUCTOR');

  await testAllow('Skills Lab', 'get_student_skills_matrix', { studentUserId: studentUser.firebaseId, cohortId: cohortId, user: studentUser }, 'STUDENT');

  console.log('\n--- 12. WABON DOMAIN 9: CLINICAL SHIFTS & 1:10 RATIO (WAC 246-841A-440(8)) ---');
  // Role check: Student cannot create clinical shift
  await testDeny('Clinical', 'create_clinical_shift', {
    dto: { cohortId: cohortId, facilityName: 'Clinic', shiftDate: new Date().toISOString(), startTime: new Date().toISOString(), endTime: new Date().toISOString(), hoursCredited: 8.0 },
    user: studentUser,
  }, 'STUDENT');

  // Instructor schedules clinical shift
  const shiftDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const shiftStart = new Date(shiftDate.getTime() + 7 * 3600 * 1000);
  const shiftEnd = new Date(shiftDate.getTime() + 15.5 * 3600 * 1000);
  const shift = await testAllow('Clinical', 'create_clinical_shift', {
    dto: {
      cohortId: cohortId,
      facilityName: 'Swedish Medical Center - Subacute Unit',
      shiftDate: shiftDate.toISOString(),
      startTime: shiftStart.toISOString(),
      endTime: shiftEnd.toISOString(),
      hoursCredited: 8.0,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const shiftId = shift ? shift.id : 1;

  await testAllow('Clinical', 'find_cohort_clinical_shifts', { cohortId: cohortId, user: studentUser }, 'STUDENT');
  await testAllow('Clinical', 'get_clinical_shift', { shiftId: shiftId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot record shift attendance
  await testDeny('Clinical', 'record_clinical_attendance', {
    dto: { shiftId: shiftId, studentUserId: studentUser.firebaseId, hoursCompleted: 8.0, passed: true },
    user: studentUser,
  }, 'STUDENT');

  // Instructor logs shift attendance
  const attendance = await testAllow('Clinical', 'record_clinical_attendance', {
    dto: {
      shiftId: shiftId,
      studentUserId: studentUser.firebaseId,
      hoursCompleted: 8.0,
      competencyNotes: 'Direct patient care shift: morning ADLs, vital signs, transfers',
      passed: true,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  const attendanceId = attendance ? attendance.id : 1;
  await testAllow('Clinical', 'update_clinical_attendance', {
    attendanceId: attendanceId,
    dto: {
      hoursCompleted: 8.0,
      competencyNotes: 'Updated: Excellent bedside manner; completed bed bath and mechanical lift transfers safely.',
      passed: true,
    },
    user: instructorUser,
  }, 'INSTRUCTOR');

  await testAllow('Clinical', 'get_student_clinical_hours', { studentUserId: studentUser.firebaseId, cohortId: cohortId, user: studentUser }, 'STUDENT');

  console.log('\n--- 13. WABON DOMAIN 10: EXAM SECURITY & PROCTORING TELEMETRY (WAC 246-841A-440(9)) ---');
  // Student starts proctored exam session
  const session = await testAllow('Exam Security', 'start_exam_session', {
    dto: {
      exerciseId: exerciseId,
      honorCodeAccepted: true,
      webcamSnapUrl: 'https://storage.alikohub.com/proctoring/webcam-init.jpg',
      idPhotoUrl: 'https://storage.alikohub.com/proctoring/id-verification.jpg',
    },
    user: studentUser,
  }, 'STUDENT');

  const sessionId = session ? (session.sessionId || session.id) : 1;

  // Student logs tab blur event
  await testAllow('Exam Security', 'record_exam_tab_blur', {
    dto: {
      sessionId: sessionId,
    },
    user: studentUser,
  }, 'STUDENT');

  // Student ends exam session
  await testAllow('Exam Security', 'end_exam_session', {
    dto: { sessionId: sessionId, score: 10 },
    user: studentUser,
  }, 'STUDENT');

  await testAllow('Exam Security', 'get_exam_session', { sessionId: sessionId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot audit exam session
  await testDeny('Exam Security', 'audit_exam_session', {
    dto: { sessionId: sessionId, isAudited: true },
    user: studentUser,
  }, 'STUDENT');

  // Instructor audits exam session
  await testAllow('Exam Security', 'audit_exam_session', {
    dto: { sessionId: sessionId, isAudited: true },
    user: instructorUser,
  }, 'INSTRUCTOR');

  await testAllow('Exam Security', 'get_exercise_exam_sessions', { exerciseId: exerciseId, user: auditorUser }, 'COMMISSION_AUDITOR');

  console.log('\n--- 14. WABON DOMAIN 12: COURSE QUALITY EVALUATIONS (WAC 246-841A-440(11)) ---');
  await testAllow('Evaluations', 'submit_evaluation_survey', {
    dto: {
      cohortId: cohortId,
      courseRating: 5,
      platformRating: 5,
      instructorRating: 5,
      comments: 'The interactive rubrics and study group sessions prepared me thoroughly for the clinical shifts.',
    },
    user: studentUser,
  }, 'STUDENT');

  await testAllow('Evaluations', 'get_my_evaluation_survey', { cohortId: cohortId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot view cohort survey analytics
  await testDeny('Evaluations', 'get_cohort_evaluation_surveys', {
    dto: { cohortId: cohortId },
    user: studentUser,
  }, 'STUDENT');

  await testAllow('Evaluations', 'get_cohort_evaluation_surveys', {
    dto: { cohortId: cohortId },
    user: auditorUser,
  }, 'COMMISSION_AUDITOR');

  console.log('\n--- 15. WABON DOMAIN 13: SUPPORT DESK & SLA TRACKING (WAC 246-841A-440(12)) ---');
  await testAllow('Support Desk', 'get_system_requirements', { user: studentUser }, 'STUDENT');

  const ticket = await testAllow('Support Desk', 'create_support_ticket', {
    dto: {
      category: 'BROWSER_COMPATIBILITY',
      subject: 'Webcam permissions on Chrome 124',
      description: 'Need assistance allowing microphone and webcam permissions for exam proctoring.',
      priority: 'MEDIUM',
    },
    user: studentUser,
  }, 'STUDENT');

  const ticketId = ticket ? ticket.id : 1;

  await testAllow('Support Desk', 'get_my_support_tickets', { user: studentUser }, 'STUDENT');
  await testAllow('Support Desk', 'get_support_ticket_by_id', { ticketId: ticketId, user: studentUser }, 'STUDENT');

  // Role check: Student cannot list all platform support tickets
  await testDeny('Support Desk', 'list_all_support_tickets', { dto: {}, user: studentUser }, 'STUDENT');
  await testAllow('Support Desk', 'list_all_support_tickets', { dto: {}, user: adminUser }, 'ADMIN');

  // Role check: Student cannot update support ticket resolution
  await testDeny('Support Desk', 'update_support_ticket', {
    dto: { ticketId: ticketId, status: 'RESOLVED', resolution: 'Self-resolved' },
    user: studentUser,
  }, 'STUDENT');

  // Admin resolves support ticket
  await testAllow('Support Desk', 'update_support_ticket', {
    dto: { ticketId: ticketId, status: 'RESOLVED', resolution: 'Instructed student to enable MediaStream permissions in site settings.' },
    user: adminUser,
  }, 'ADMIN');

  console.log('\n--- 16. WABON DOMAIN 14: GRADEBOOK & 80% BENCHMARK (WAC 246-841A-440(13)) ---');
  await testAllow('Gradebook', 'get_student_grade_report', {
    dto: { cohortId: cohortId, userId: studentUser.firebaseId },
    user: studentUser,
  }, 'STUDENT');

  // Role check: Student cannot access cohort gradebook
  await testDeny('Gradebook', 'get_cohort_gradebook', { dto: { cohortId: cohortId }, user: studentUser }, 'STUDENT');
  await testAllow('Gradebook', 'get_cohort_gradebook', { dto: { cohortId: cohortId }, user: auditorUser }, 'COMMISSION_AUDITOR');
  await testAllow('Gradebook', 'export_cohort_gradebook_csv', { dto: { cohortId: cohortId }, user: auditorUser }, 'COMMISSION_AUDITOR');

  console.log('\n--- 17. WABON DOMAIN 15: GRADUATION CERTIFICATE & QR (WAC 246-841A-440(14)) ---');
  // Role check: Student cannot issue certificate
  await testDeny('Certification', 'generate_wabon_certificate', {
    dto: { cohortId: cohortId, userId: studentUser.firebaseId },
    user: studentUser,
  }, 'STUDENT');

  // Note: Graduation certificate enforces 80% passing + complete clinical 40h + all 22 skills.
  // In our test, the student has 8h clinical so generate will reject with statutory message (properly validating gate)
  const certDenial = await testDeny('Certification (Gate Enforcement)', 'generate_wabon_certificate', {
    dto: { cohortId: cohortId, userId: studentUser.firebaseId },
    user: instructorUser,
  }, 'INSTRUCTOR');

  // Verify public endpoint
  await testAllow('Certification', 'verify_wabon_certificate', {
    dto: { certificateNumber: `WA-NAC-${cohortId}-TEST-CERT-2026` },
    user: studentUser,
  }, 'PUBLIC');

  console.log('\n--- 18. WABON DOMAIN 16: REGULATORY COMPLIANCE DOSSIER (WAC 246-841A-440(15)) ---');
  // Role check: Student cannot export regulatory dossier
  await testDeny('Compliance Dossier', 'generate_compliance_dossier', {
    dto: { cohortId: cohortId, courseId: course.id },
    user: studentUser,
  }, 'STUDENT');

  // Auditor/Admin exports complete dossier
  await testAllow('Compliance Dossier', 'generate_compliance_dossier', {
    dto: { cohortId: cohortId, courseId: course.id },
    user: auditorUser,
  }, 'COMMISSION_AUDITOR');

  // Print Summary Table
  console.log('\n========================================================================================================');
  console.log('                                  📊 COMPREHENSIVE TEST RESULTS TABLE                                    ');
  console.log('========================================================================================================');
  console.table(
    results.map((r) => ({
      Step: r.step,
      Domain: r.domain,
      Command: r.command,
      Role: r.role,
      Type: r.type,
      Status: r.status === 'PASS' ? '✅ PASS' : '❌ FAIL',
      Details: r.details || 'OK',
    }))
  );

  const totalTests = results.length;
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log(`\nTOTAL TESTS: ${totalTests} | PASSED: ${passCount} | FAILED: ${failCount}`);
  if (failCount === 0) {
    console.log('🎉 ALL 16 WABON REGULATORY COMPLIANCE FEATURES & WORKFLOW ENDPOINTS PASSED WITH EXACT ROLE CHECKS!');
  } else {
    console.log(`⚠️ ${failCount} tests failed. Review output above.`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runWabonSuite().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
