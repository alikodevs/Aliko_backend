const fs = require('fs');
const path = require('path');

function createRequest(name, method, urlPath, body = null, description = '', testScript = '') {
  const pathSegments = urlPath.replace(/^\//, '').split('/');
  const headers = [
    { key: 'Authorization', value: 'Bearer {{authToken}}', type: 'text' },
  ];

  const req = {
    name,
    request: {
      method,
      header: headers,
      url: {
        raw: `{{baseUrl}}/${urlPath.replace(/^\//, '')}`,
        host: ['{{baseUrl}}'],
        path: pathSegments,
      },
      description,
    },
    response: [],
  };

  if (body) {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    req.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (testScript) {
    req.event = [
      {
        listen: 'test',
        script: {
          exec: testScript.split('\n'),
          type: 'text/javascript',
        },
      },
    ];
  }

  return req;
}

const collection = {
  info: {
    _postman_id: 'aliko-wabon-compliance-collection-v1',
    name: 'AlikoHub Academy — WABON Regulatory Compliance & Rubrics API',
    description: 'Complete Postman API Collection covering all Washington State Board of Nursing (WABON - WAC 246-841A-440) compliance requirements, student learning lifecycle, rubrics, exam security, skills lab, clinical hours, and regulatory dossier exporter.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:3000', type: 'string' },
    { key: 'authToken', value: '{{studentToken}}', type: 'string' },
    { key: 'studentToken', value: '', type: 'string' },
    { key: 'instructorToken', value: '', type: 'string' },
    { key: 'adminToken', value: '', type: 'string' },
    { key: 'courseId', value: '1', type: 'string' },
    { key: 'cohortId', value: '1', type: 'string' },
    { key: 'moduleId', value: '1', type: 'string' },
    { key: 'lessonId', value: '1', type: 'string' },
    { key: 'exerciseId', value: '1', type: 'string' },
    { key: 'studentUserId', value: 'test-student-firebase-uid', type: 'string' },
    { key: 'instructorUserId', value: 'test-instructor-firebase-uid', type: 'string' },
  ],
  item: [
    // 01. Admissions & Statutory Screening Gate
    {
      name: '01. Admissions & Statutory Screening Gate (WAC 246-841A-440(1))',
      description: 'Covers mandatory student background checks, TB test proof, immunizations, CPR certification, high school verification, statutory disclosures e-signature, and instructor/admin approval gate.',
      item: [
        createRequest(
          '1.1 Submit Admissions Application',
          'POST',
          'api/v1/academy/admissions/submit',
          {
            cohortId: 1,
            backgroundCheckUrl: 'https://storage.alikohub.com/admissions/bg-check-001.pdf',
            tbTestProofUrl: 'https://storage.alikohub.com/admissions/tb-test-negative-2026.pdf',
            immunizationProofUrl: 'https://storage.alikohub.com/admissions/immunization-records.pdf',
            cprCertUrl: 'https://storage.alikohub.com/admissions/bls-cpr-aha-card.pdf',
            idDocUrl: 'https://storage.alikohub.com/admissions/wa-state-drivers-license.jpg',
            highSchoolProofUrl: 'https://storage.alikohub.com/admissions/high-school-diploma.pdf',
          },
          'Student uploads required verification documentation before class entry.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("applicationId", res.id);\n    pm.test("Application submitted with PENDING status", () => {\n        pm.expect(res.status).to.be.oneOf(["PENDING", "APPROVED"]);\n    });\n}`
        ),
        createRequest(
          '1.2 Sign Statutory Disclosures & Enrollment Agreement',
          'POST',
          'api/v1/academy/admissions/sign-agreement',
          {
            cohortId: 1,
            signatureUrl: 'https://storage.alikohub.com/admissions/e-signature-student-001.png',
            disclosuresAcknowledged: true,
          },
          'Student e-signs RCW/WAC statutory disclosures (DSHS disqualifying crimes, refund policy, physical demands of nursing).',
          `pm.test("Enrollment agreement successfully signed", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 201]);\n    const res = pm.response.json();\n    pm.expect(res.agreementSigned).to.be.true;\n});`
        ),
        createRequest(
          '1.3 Get My Admissions Application',
          'GET',
          'api/v1/academy/admissions/my-application/1',
          null,
          'Student retrieves their application status and verification history.'
        ),
        createRequest(
          '1.4 Get Cohort Admissions Applications (Instructor/Admin)',
          'GET',
          'api/v1/academy/admissions/cohort/1',
          null,
          'Program Director / Instructor lists all applications submitted for Cohort 1.'
        ),
        createRequest(
          '1.5 Review & Approve Admissions Application (Director Gate)',
          'PATCH',
          'api/v1/academy/admissions/review',
          {
            applicationId: 1,
            status: 'APPROVED',
            rejectionReason: null,
          },
          'Director approves student admission, automatically activating student cohort enrollment.',
          `pm.test("Application reviewed and approved", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 204]);\n});`
        ),
      ],
    },

    // 02. Orientation & Attendance Census Gate
    {
      name: '02. Orientation & Attendance Census (WAC 246-841A-440(2))',
      description: 'Mandatory zero-credit online orientation module covering platform navigation, academic integrity, attendance policy, and clinical dress code before course unlocking.',
      item: [
        createRequest(
          '2.1 Check Orientation Status',
          'GET',
          'api/v1/academy/orientation/status/1',
          null,
          'Check whether student has satisfied the orientation prerequisite for cohort 1.',
          `pm.test("Status retrieved", () => pm.expect(pm.response.code).to.equal(200));`
        ),
        createRequest(
          '2.2 Complete Orientation Module',
          'POST',
          'api/v1/academy/orientation/complete',
          {
            cohortId: 1,
          },
          'Record completion of mandatory zero-credit orientation checklist.',
          `pm.test("Orientation marked complete", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 201]);\n});`
        ),
      ],
    },

    // 03. Curriculum & Textbook Crosswalk
    {
      name: '03. Curriculum & Textbook Crosswalk (WAC 246-841A-440(3))',
      description: 'Statutory curriculum-to-textbook alignment matrix linking course syllabus, chapters, and required readings to accredited NA textbooks.',
      item: [
        createRequest(
          '3.1 Register Course Textbook',
          'POST',
          'api/v1/academy/curriculum-crosswalk/textbooks',
          {
            courseId: 1,
            title: "Mosby's Textbook for Nursing Assistants",
            author: 'Sheila A. Sorrentino & Leighann Remmert',
            edition: '10th Edition',
            isbn: '978-0323655804',
            publisher: 'Elsevier',
          },
          'Instructor registers approved core nursing assistant textbook.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("textbookId", res.id);\n}`
        ),
        createRequest(
          '3.2 Get Course Textbooks',
          'GET',
          'api/v1/academy/curriculum-crosswalk/textbooks/course/1',
          null,
          'Retrieve all registered textbooks for Course 1.'
        ),
        createRequest(
          '3.3 Assign Lesson Required Reading',
          'POST',
          'api/v1/academy/curriculum-crosswalk/readings',
          {
            lessonId: 1,
            textbookId: 1,
            chapterNumber: 12,
            chapterTitle: 'Infection Prevention and Control in Subacute Care',
            pages: '145-168',
            topicsCovered: [
              'Chain of Infection',
              'Standard Precautions',
              'Bloodborne Pathogens (OSHA)',
              'Donning and Doffing PPE'
            ],
          },
          'Assign specific textbook chapter and page readings to Lesson 1.',
          `pm.test("Lesson reading mapped", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '3.4 Get Lesson Readings',
          'GET',
          'api/v1/academy/curriculum-crosswalk/readings/lesson/1',
          null,
          'Retrieve assigned reading materials for Lesson 1.'
        ),
        createRequest(
          '3.5 Generate Course Curriculum Crosswalk Matrix',
          'GET',
          'api/v1/academy/curriculum-crosswalk/matrix/course/1',
          null,
          'Generates complete WABON curriculum-textbook crosswalk table for regulatory inspection.'
        ),
      ],
    },

    // 04. Multi-Criteria Rubrics
    {
      name: '04. Multi-Criteria Rubrics (Explicit User Specification)',
      description: 'Standardized grading rubrics for discussions and assignments featuring multi-level criteria, scoring scales, cloning, and automated evaluation.',
      item: [
        createRequest(
          '4.1 Create Rubric with Criteria & Performance Levels',
          'POST',
          'api/v1/academy/rubrics',
          {
            name: 'Clinical Judgment & Infection Control Rubric',
            description: 'Assesses critical thinking, communication, and adherence to CDC/OSHA infection control protocols.',
            type: 'DISCUSSION',
            isActive: true,
            criteria: [
              {
                title: 'Subject Mastery & WABON Core Knowledge',
                description: 'Demonstrates deep comprehension of standard precautions, safety protocols, and resident dignity.',
                maxPoints: 10,
                order: 1,
                levels: [
                  {
                    name: 'Exemplary',
                    description: 'Flawlessly articulates all infection control principles with direct textbook citations.',
                    points: 10,
                    order: 1,
                  },
                  {
                    name: 'Competent',
                    description: 'Identifies core safety precautions; minor gaps in technical rationales.',
                    points: 7,
                    order: 2,
                  },
                  {
                    name: 'Developing',
                    description: 'Basic awareness with noticeable omissions in critical safety protocols.',
                    points: 4,
                    order: 3,
                  },
                  {
                    name: 'Unacceptable',
                    description: 'Fails to identify essential standard precautions or violates safety norms.',
                    points: 0,
                    order: 4,
                  },
                ],
              },
              {
                title: 'Peer Engagement & Substantive Dialogue',
                description: 'Critically responds to at least two classmates with constructive clinical feedback.',
                maxPoints: 5,
                order: 2,
                levels: [
                  {
                    name: 'Substantive',
                    description: 'Engaged 2+ peers with insightful clinical inquiries and supportive dialogue.',
                    points: 5,
                    order: 1,
                  },
                  {
                    name: 'Minimal',
                    description: 'Posted brief confirmation without substantive clinical reasoning.',
                    points: 2.5,
                    order: 2,
                  },
                  {
                    name: 'None',
                    description: 'Did not interact with peer cohort.',
                    points: 0,
                    order: 3,
                  },
                ],
              },
            ],
          },
          'Instructor creates standardized rubric.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("rubricId", res.id);\n    pm.test("Rubric created with criteria", () => pm.expect(res.name).to.exist);\n}`
        ),
        createRequest(
          '4.2 List Rubrics (Filter by Type)',
          'GET',
          'api/v1/academy/rubrics?type=DISCUSSION&isActive=true',
          null,
          'Query all active discussion rubrics.'
        ),
        createRequest(
          '4.3 Get Rubric by ID',
          'GET',
          'api/v1/academy/rubrics/{{rubricId}}',
          null,
          'Retrieve rubric schema with complete criteria and level hierarchy.'
        ),
        createRequest(
          '4.4 Clone Rubric for New Term',
          'POST',
          'api/v1/academy/rubrics/{{rubricId}}/clone',
          {
            rubricId: '{{rubricId}}',
            newName: 'Clinical Judgment & Infection Control Rubric (Cohort 2 Clone)',
          },
          'Duplicate rubric and its nested criteria/levels for another cohort.',
          `pm.test("Rubric cloned", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '4.5 Evaluate Submission with Rubric',
          'POST',
          'api/v1/academy/rubrics/evaluate',
          {
            rubricId: '{{rubricId}}',
            selectedLevelIds: ['level-id-exemplary', 'level-id-substantive'],
            customFeedback: 'Excellent application of contact precaution isolation protocols during morning care demonstration.',
          },
          'Calculate weighted score and generate standardized rubric feedback evaluation.',
          `pm.test("Rubric evaluation calculated", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 201]);\n    const res = pm.response.json();\n    pm.expect(res.totalPoints).to.be.a("number");\n});`
        ),
      ],
    },

    // 05. Discussion Forums & Substantive Interaction
    {
      name: '05. Discussion Forums & Substantive Interaction (WAC 246-841A-440(4))',
      description: 'Facilitates mandatory weekly instructor-led academic discussions enforcing substantive student participation, peer replies, and rubric-based grading.',
      item: [
        createRequest(
          '5.1 Create Discussion Topic with Rubric',
          'POST',
          'api/v1/academy/discussions/topics',
          {
            moduleId: 1,
            title: 'Week 2 Discussion: Responding to Resident Fall Risk and Mobility Changes',
            prompt: 'Review the case study of Mrs. Gable (84yo, dementia, newly unsteady gait). What immediate non-pharmacological interventions must the NA implement? How do you report this to the charge nurse? Cite textbook Chapter 12.',
            rubricId: '{{rubricId}}',
            dueAt: '2026-11-01T23:59:59.000Z',
          },
          'Instructor creates weekly graded discussion topic.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("topicId", res.id);\n}`
        ),
        createRequest(
          '5.2 Find Module Discussions',
          'GET',
          'api/v1/academy/discussions/modules/1',
          null,
          'Retrieve all discussion topics configured in Module 1.'
        ),
        createRequest(
          '5.3 Get Discussion Topic with Posts',
          'GET',
          'api/v1/academy/discussions/topics/{{topicId}}',
          null,
          'Retrieve topic prompt and full threaded discussion conversation.'
        ),
        createRequest(
          '5.4 Post Substantive Discussion Contribution',
          'POST',
          'api/v1/academy/discussions/posts',
          {
            topicId: 1,
            content: 'Immediate steps: 1) Ensure non-skid socks are worn; 2) Place call bell within direct reach; 3) Clear pathway of clutter and ensure adequate lighting. I would immediately report the gait change using SBAR format to the RN supervisor to request a physical therapy re-evaluation.',
            parentId: null,
          },
          'Student posts original substantive response.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("postId", res.id);\n}`
        ),
        createRequest(
          '5.5 Grade Discussion Post (Instructor Rubric)',
          'POST',
          'api/v1/academy/discussions/posts/{{postId}}/grade',
          {
            grade: 15,
            feedback: 'Superb application of resident safety measures and clear SBAR escalation to the charge nurse.',
            isSubstantive: true,
          },
          'Instructor awards points and marks post as meeting substantive interaction criteria.',
          `pm.test("Post graded successfully", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
      ],
    },

    // 06. Study Groups & Peer Collaboration
    {
      name: '06. Study Groups & Peer Collaboration (WAC 246-841A-440(5))',
      description: 'Cohort-based peer study groups supporting collaboration, shared study schedules, and meeting coordination.',
      item: [
        createRequest(
          '6.1 Create Study Group',
          'POST',
          'api/v1/academy/study-groups',
          {
            cohortId: 1,
            name: 'Vital Signs & Pharmacology Mastery Group',
            description: 'Weekly peer review of normal BP ranges, apical pulses, and medical terminology.',
            meetingSchedule: 'Tuesdays & Thursdays at 6:00 PM PST',
            meetingLink: 'https://meet.google.com/xyz-aliko-study',
            maxMembers: 5,
          },
          'Student or instructor creates peer study circle.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("studyGroupId", res.id);\n}`
        ),
        createRequest(
          '6.2 Find Cohort Study Groups',
          'GET',
          'api/v1/academy/study-groups/cohort/1',
          null,
          'Retrieve all available study groups in Cohort 1.'
        ),
        createRequest(
          '6.3 Join Study Group',
          'POST',
          'api/v1/academy/study-groups/join',
          {
            studyGroupId: 1,
          },
          'Student joins the study group.',
          `pm.test("Joined study group", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '6.4 Update Study Group Schedule',
          'PATCH',
          'api/v1/academy/study-groups/1',
          {
            meetingSchedule: 'Wednesdays & Fridays at 7:00 PM PST',
            meetingLink: 'https://meet.google.com/updated-aliko-study',
          },
          'Group organizer updates meeting time and URL.'
        ),
        createRequest(
          '6.5 Leave Study Group',
          'POST',
          'api/v1/academy/study-groups/1/leave',
          null,
          'Student leaves group.'
        ),
      ],
    },

    // 07. Active Seat-Time Heartbeat Engine
    {
      name: '07. Active Seat-Time Heartbeat Engine (WAC 246-841A-440(6))',
      description: 'High-precision active presence monitoring tracking active engagement pulses every 30-60 seconds to satisfy the 60-hour theory mandate.',
      item: [
        createRequest(
          '7.1 Record Active Seat-Time Heartbeat Pulse',
          'POST',
          'api/v1/academy/seat-time/heartbeat',
          {
            lessonId: 1,
            courseId: 1,
            intervalSeconds: 60,
            engagementScore: 0.95,
            interactionType: 'VIDEO_PLAYBACK',
          },
          'Client application pulses heartbeat while student actively consumes educational content.',
          `pm.test("Heartbeat recorded", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 201]);\n    const res = pm.response.json();\n    pm.expect(res.totalSeconds).to.be.a("number");\n});`
        ),
        createRequest(
          '7.2 Get Course Seat-Time Summary (60-Hour Theory Tracker)',
          'GET',
          'api/v1/academy/seat-time/summary/course/1',
          null,
          'Aggregates cumulative seat time across all lessons against the 60-hour theory requirement.'
        ),
        createRequest(
          '7.3 Get Specific Lesson Seat-Time Breakdown',
          'GET',
          'api/v1/academy/seat-time/lesson/1/course/1',
          null,
          'View individual lesson seat-time logs and engagement score history.'
        ),
        createRequest(
          '7.4 Cohort-Wide Seat-Time Audit Report (Auditor/Instructor)',
          'GET',
          'api/v1/academy/seat-time/cohort/1/report',
          null,
          'Generates regulatory seat-time compliance breakdown for every student in Cohort 1.'
        ),
      ],
    },

    // 08. Skills Lab Competency Matrix
    {
      name: '08. Skills Lab Competency Matrix (WAC 246-841A-440(7))',
      description: 'Tracking, checklist evaluation, and verification of all 22+ Core Washington State Nursing Assistant clinical skills.',
      item: [
        createRequest(
          '8.1 Register Core NA Skill',
          'POST',
          'api/v1/academy/skills-lab/skills',
          {
            skillNumber: 'SKILL-01',
            title: 'Hand Hygiene (Medical Asepsis)',
            category: 'INFECTION_CONTROL',
            description: 'Decontaminates hands using soap and warm water with proper friction, wrist coverage, and clean paper towel technique without recontaminating.',
            criticalSteps: [
              'Wet hands and wrists thoroughly under running water, keeping hands lower than elbows.',
              'Apply soap and lather all surfaces including wrists, backs of hands, and between fingers for at least 20 seconds.',
              'Clean under fingernails against palm of opposite hand.',
              'Rinse hands thoroughly with fingertips pointing downward.',
              'Dry hands with clean paper towel and discard.',
              'Turn off faucet with a separate clean, dry paper towel without touching clean hands to faucet handle.'
            ],
            passingScore: 100,
          },
          'Instructor/Admin initializes Core NA clinical competency skill.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("skillId", res.id);\n}`
        ),
        createRequest(
          '8.2 List Core NA Skills',
          'GET',
          'api/v1/academy/skills-lab/skills',
          null,
          'List all registered 22+ core skills and their critical steps.'
        ),
        createRequest(
          '8.3 Record Skill Checkoff Evaluation Attempt',
          'POST',
          'api/v1/academy/skills-lab/checkoffs',
          {
            skillId: 1,
            studentUserId: '{{studentUserId}}',
            cohortId: 1,
            status: 'PASSED',
            attemptNumber: 1,
            criticalStepsCompleted: [
              'Wet hands and wrists thoroughly under running water, keeping hands lower than elbows.',
              'Apply soap and lather all surfaces including wrists, backs of hands, and between fingers for at least 20 seconds.',
              'Clean under fingernails against palm of opposite hand.',
              'Rinse hands thoroughly with fingertips pointing downward.',
              'Dry hands with clean paper towel and discard.',
              'Turn off faucet with a separate clean, dry paper towel without touching clean hands to faucet handle.'
            ],
            notes: 'Demonstrated exceptional adherence to medical asepsis; zero recontamination observed.',
            signatureUrl: 'https://storage.alikohub.com/signatures/rn-evaluator-mary-smith.png',
          },
          'RN Instructor signs off student clinical lab competency.',
          `pm.test("Skill checkoff verified", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '8.4 Get Student Skills Lab Matrix',
          'GET',
          'api/v1/academy/skills-lab/matrix/student/{{studentUserId}}/cohort/1',
          null,
          'Retrieves student 22-skill progress matrix (Passed, Practice, Attempted, Incomplete).'
        ),
      ],
    },

    // 09. Clinical Hours & 1:10 Ratio Enforcement
    {
      name: '09. Clinical Hours & 1:10 Ratio Enforcement (WAC 246-841A-440(8))',
      description: 'Enforces statutory 1:10 student-to-instructor ratio in healthcare facility clinicals and tracks completion of 40 direct patient care clinical hours.',
      item: [
        createRequest(
          '9.1 Create Clinical Shift (1:10 Ratio Enforced)',
          'POST',
          'api/v1/academy/clinical/shifts',
          {
            cohortId: 1,
            facilityName: 'PeaceHealth St. Joseph Medical Center - Transitional Care Unit',
            facilityAddress: '2901 Squalicum Pkwy, Bellingham, WA 98225',
            instructorId: '{{instructorUserId}}',
            startTime: '2026-11-10T07:00:00.000Z',
            endTime: '2026-11-10T15:30:00.000Z',
            totalHours: 8.0,
            maxStudents: 10,
          },
          'Instructor schedules clinical shift capped at maximum 10 students.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("shiftId", res.id);\n}`
        ),
        createRequest(
          '9.2 Find Cohort Clinical Shifts',
          'GET',
          'api/v1/academy/clinical/shifts/cohort/1',
          null,
          'Retrieve all scheduled clinical shifts for Cohort 1.'
        ),
        createRequest(
          '9.3 Record Student Clinical Attendance & Hours',
          'POST',
          'api/v1/academy/clinical/attendance',
          {
            shiftId: 1,
            studentUserId: '{{studentUserId}}',
            hoursCompleted: 8.0,
            status: 'PRESENT',
            performanceRating: 5,
            preceptorFeedback: 'Excellent morning care rounds; accurately assisted with bathing, transfers, and fluid tracking.',
            supervisorSignatureUrl: 'https://storage.alikohub.com/signatures/rn-preceptor-signoff-001.png',
          },
          'Clinical supervisor verifies 8 hours of direct patient care clinical attendance.',
          `pm.test("Clinical attendance recorded", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '9.4 Get Cumulative Student Clinical Hours (40h Minimum)',
          'GET',
          'api/v1/academy/clinical/hours/student/{{studentUserId}}/cohort/1',
          null,
          'Verifies student total accumulated clinical hours toward the statutory 40-hour graduation threshold.'
        ),
      ],
    },

    // 10. Exam Security & Proctoring
    {
      name: '10. Exam Security & Proctoring (WAC 246-841A-440(9))',
      description: 'Webcam snapshot identity verification, active tab-blur telemetry, and post-exam proctoring audit verification.',
      item: [
        createRequest(
          '10.1 Start Proctored Exam Session',
          'POST',
          'api/v1/academy/exam-security/sessions/start',
          {
            exerciseId: 1,
            webcamSnapshotUrl: 'https://storage.alikohub.com/proctoring/webcam-face-verify-001.jpg',
            photoIdSnapshotUrl: 'https://storage.alikohub.com/proctoring/photo-id-verify-001.jpg',
            clientIp: '198.51.100.42',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          },
          'Student begins secure proctored examination with facial & ID snapshot verification.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("sessionId", res.id);\n}`
        ),
        createRequest(
          '10.2 Record Tab-Blur / Window Switch Telemetry',
          'POST',
          'api/v1/academy/exam-security/sessions/tab-blur',
          {
            sessionId: 1,
            blurDurationSeconds: 4,
            currentQuestionIndex: 14,
          },
          'Client reports loss of browser window focus during exam.'
        ),
        createRequest(
          '10.3 End Proctored Exam Session',
          'POST',
          'api/v1/academy/exam-security/sessions/end',
          {
            sessionId: 1,
          },
          'Finalizes exam security session with duration and integrity metrics.',
          `pm.test("Exam session finalized", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '10.4 Get Exam Session Details',
          'GET',
          'api/v1/academy/exam-security/sessions/1',
          null,
          'Retrieve security audit trail including blur counts and identity verification photos.'
        ),
        createRequest(
          '10.5 Audit Exam Session (Instructor Verification)',
          'POST',
          'api/v1/academy/exam-security/sessions/audit',
          {
            sessionId: 1,
            isFlagged: false,
            auditNotes: 'Reviewed tab blur incident; minor 4-second notification popup. Identity confirmed. No academic dishonesty.',
          },
          'Instructor verifies and approves exam session integrity.'
        ),
      ],
    },

    // 11. Instructor Qualifications & RN Credentialing
    {
      name: '11. Instructor Qualifications & RN Credentialing (WAC 246-841A-440(10))',
      description: 'Validates instructor active RN license, train-the-trainer certificate, and clinical experience prior to cohort instruction.',
      item: [
        createRequest(
          '11.1 Register RN Instructor Credentials',
          'POST',
          'api/v1/academy/instructors/credentials',
          {
            rnLicenseNumber: 'RN60894512',
            licenseState: 'WA',
            licenseExpiration: '2027-08-31T00:00:00.000Z',
            trainTheTrainerCertUrl: 'https://storage.alikohub.com/credentials/train-the-trainer-cert.pdf',
            yearsClinicalExperience: 7,
            highestDegree: 'MSN - Nursing Education',
          },
          'Nurse registers state license and specialized teaching qualifications.',
          `pm.test("Credentials registered", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '11.2 Get Instructor Credential Details',
          'GET',
          'api/v1/academy/instructors/credentials/{{instructorUserId}}',
          null,
          'Inspect RN license and verification status.'
        ),
        createRequest(
          '11.3 Approve Instructor Credentials (Director)',
          'POST',
          'api/v1/academy/instructors/approve',
          {
            instructorUserId: '{{instructorUserId}}',
            status: 'APPROVED',
            directorNotes: 'Verified active unencumbered WA RN license on DOH portal. Train-the-trainer certificate verified on file.',
          },
          'Program Director approves RN instructor to lead cohorts.'
        ),
        createRequest(
          '11.4 List All Program Instructors (Auditor/Admin)',
          'GET',
          'api/v1/academy/instructors/all',
          null,
          'Review all approved instructional staff and their active licensing status.'
        ),
      ],
    },

    // 12. Course Quality Evaluations
    {
      name: '12. Course Quality Evaluations (WAC 246-841A-440(11))',
      description: 'End-of-course student evaluation surveys collecting quality improvement analytics on theory, clinical, instructor effectiveness, and support.',
      item: [
        createRequest(
          '12.1 Submit End-of-Course Evaluation Survey',
          'POST',
          'api/v1/academy/evaluations/surveys',
          {
            cohortId: 1,
            overallSatisfaction: 5,
            theoryEffectiveness: 5,
            clinicalRelevance: 5,
            instructorRating: 5,
            facilityRating: 4,
            feedbackComment: 'The hybrid theory lectures combined with intensive skills checkoffs prepared me thoroughly for the NNAAP state board exam. Preceptor at PeaceHealth was outstanding.',
          },
          'Student submits course feedback.',
          `pm.test("Survey submitted", () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`
        ),
        createRequest(
          '12.2 Get My Submitted Survey',
          'GET',
          'api/v1/academy/evaluations/my-survey/1',
          null,
          'Check submission status for Cohort 1.'
        ),
        createRequest(
          '12.3 Get Cohort Evaluation Survey Analytics (Director)',
          'GET',
          'api/v1/academy/evaluations/cohort/1',
          null,
          'Aggregated survey statistics for Quality Improvement audits.'
        ),
      ],
    },

    // 13. Technical Support Desk & SLA Tracking
    {
      name: '13. Technical Support Desk & SLA Tracking (WAC 246-841A-440(12))',
      description: 'Technical support ticketing and minimum hardware/software system requirements ensuring equitable student access under WABON distance education rules.',
      item: [
        createRequest(
          '13.1 Get Minimum System Requirements',
          'GET',
          'api/v1/academy/support-desk/system-requirements',
          null,
          'Retrieve officially mandated hardware, OS, webcam, and internet bandwidth specifications.'
        ),
        createRequest(
          '13.2 Create Technical Support Ticket',
          'POST',
          'api/v1/academy/support-desk/tickets',
          {
            category: 'EXAM_PROCTORING',
            priority: 'HIGH',
            subject: 'Webcam snapshot permission denied on Chrome Mac',
            description: 'During exam session setup, Chrome indicates media permissions blocked by macOS system security.',
            deviceInfo: 'MacBook Air M2, macOS 14.3 Sonoma, Chrome 120',
          },
          'Student logs support request.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.id) pm.environment.set("ticketId", res.id);\n}`
        ),
        createRequest(
          '13.3 Get My Support Tickets',
          'GET',
          'api/v1/academy/support-desk/tickets/me',
          null,
          'Student views status of their open and resolved tickets.'
        ),
        createRequest(
          '13.4 List All Support Tickets (Staff Queue)',
          'GET',
          'api/v1/academy/support-desk/tickets?status=OPEN&priority=HIGH',
          null,
          'Support technicians review unresolved queue.'
        ),
        createRequest(
          '13.5 Update Ticket Status & Resolution (SLA Compliance)',
          'PATCH',
          'api/v1/academy/support-desk/tickets/1',
          {
            ticketId: 1,
            status: 'RESOLVED',
            resolutionNotes: 'Guided student via screen share to macOS System Settings > Privacy & Security > Camera > enable Chrome. Verified video stream functional.',
          },
          'Staff records ticket resolution and closes issue.'
        ),
      ],
    },

    // 14. Gradebook & 80% Benchmark Verification
    {
      name: '14. Gradebook & 80% Benchmark Verification (WAC 246-841A-440(13))',
      description: 'Weighted grade calculations enforcing the mandatory 80% theory passing threshold, orientation census check, and CSV audit export.',
      item: [
        createRequest(
          '14.1 Get Student Grade Report (80% Benchmark Gate)',
          'GET',
          'api/v1/academy/gradebook/student/1',
          null,
          'Inspect student theory grade, passing status (>=80%), clinical hours, and lab completion.',
          `pm.test("Grade report generated", () => {\n    pm.expect(pm.response.code).to.equal(200);\n    const res = pm.response.json();\n    pm.expect(res.meetsTheoryRequirement).to.be.a("boolean");\n});`
        ),
        createRequest(
          '14.2 Get Cohort Gradebook Matrix (Instructor)',
          'GET',
          'api/v1/academy/gradebook/cohort/1',
          null,
          'Instructor views comprehensive grade matrix for all enrolled students in Cohort 1.'
        ),
        createRequest(
          '14.3 Export Cohort Gradebook CSV (WABON Format)',
          'GET',
          'api/v1/academy/gradebook/cohort/1/export-csv',
          null,
          'Exports downloadable CSV roster with theory scores, attendance, and clinical checkoffs for state compliance files.'
        ),
      ],
    },

    // 15. Certification & QR Verification
    {
      name: '15. Certification & QR Verification (WAC 246-841A-440(14))',
      description: 'Issues WABON Certificate of Completion with tamper-evident digital verification hash and enables instant employer/state board validation.',
      item: [
        createRequest(
          '15.1 Generate Official WABON Certificate of Completion',
          'POST',
          'api/v1/academy/certification/generate',
          {
            userId: '{{studentUserId}}',
            cohortId: 1,
            programDirectorName: 'Mary A. Smith, MSN, RN',
            programDirectorLicense: 'RN60894512',
          },
          'Validates all statutory prerequisites (60h theory >=80%, 16h lab checkoffs passed, 40h clinical complete) and generates signed certificate.',
          `if (pm.response.code === 200 || pm.response.code === 201) {\n    const res = pm.response.json();\n    if (res.certificateNumber) pm.environment.set("certificateNumber", res.certificateNumber);\n    pm.test("Certificate generated with verification QR", () => {\n        pm.expect(res.verificationUrl).to.exist;\n    });\n}`
        ),
        createRequest(
          '15.2 Verify WABON Certificate (Public / DOH / Employers)',
          'POST',
          'api/v1/academy/certification/verify',
          {
            certificateNumber: '{{certificateNumber}}',
            verificationCode: 'WABON-ALIKO-2026-VERIFIED',
          },
          'Public/Employer verification endpoint confirming student graduation date and hours.',
          `pm.test("Certificate authenticity verified", () => pm.expect(pm.response.code).to.equal(200));`
        ),
      ],
    },

    // 16. Regulatory Compliance Dossier
    {
      name: '16. Regulatory Compliance Dossier (WAC 246-841A-440(15))',
      description: 'Generates comprehensive regulatory audit dossier assembling student paperwork, attendance, seat-time logs, skills matrix, and proctoring logs for DOH/WABON inspections.',
      item: [
        createRequest(
          '16.1 Generate Complete Regulatory Compliance Dossier',
          'POST',
          'api/v1/academy/compliance-exporter/dossier',
          {
            cohortId: 1,
            studentUserId: '{{studentUserId}}',
            includeFullLogs: true,
          },
          'Generates complete regulatory dossier archive.',
          `pm.test("Compliance dossier generated", () => {\n    pm.expect(pm.response.code).to.be.oneOf([200, 201]);\n    const res = pm.response.json();\n    pm.expect(res.complianceReport).to.exist;\n});`
        ),
      ],
    },
  ],
};

const outputPaths = [
  path.join(__dirname, '..', 'postman', 'AlikoHub_Academy_WABON_Compliance.postman_collection.json'),
  path.join(__dirname, '..', 'apps', 'academy-service', 'AlikoHub_Academy_WABON_Compliance.postman_collection.json'),
];

outputPaths.forEach((outPath) => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), 'utf-8');
  console.log(`✔ WABON Compliance Postman Collection written to: ${outPath}`);
});

const environment = {
  id: 'aliko-wabon-environment-v1',
  name: 'AlikoHub WABON Compliance — Local Dev',
  values: [
    { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
    { key: 'authToken', value: '', enabled: true },
    { key: 'studentToken', value: '', enabled: true },
    { key: 'instructorToken', value: '', enabled: true },
    { key: 'adminToken', value: '', enabled: true },
    { key: 'courseId', value: '1', enabled: true },
    { key: 'cohortId', value: '1', enabled: true },
    { key: 'moduleId', value: '1', enabled: true },
    { key: 'lessonId', value: '1', enabled: true },
    { key: 'exerciseId', value: '1', enabled: true },
    { key: 'applicationId', value: '1', enabled: true },
    { key: 'rubricId', value: '1', enabled: true },
    { key: 'topicId', value: '1', enabled: true },
    { key: 'postId', value: '1', enabled: true },
    { key: 'studyGroupId', value: '1', enabled: true },
    { key: 'skillId', value: '1', enabled: true },
    { key: 'shiftId', value: '1', enabled: true },
    { key: 'sessionId', value: '1', enabled: true },
    { key: 'ticketId', value: '1', enabled: true },
    { key: 'certificateNumber', value: 'WABON-2026-CERT-0001', enabled: true },
    { key: 'studentUserId', value: 'student-firebase-uid-001', enabled: true },
    { key: 'instructorUserId', value: 'instructor-firebase-uid-001', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

const envPath = path.join(__dirname, '..', 'postman', 'AlikoHub_Academy_WABON_Compliance.postman_environment.json');
fs.writeFileSync(envPath, JSON.stringify(environment, null, 2), 'utf-8');
console.log(`✔ WABON Environment file written to: ${envPath}`);
