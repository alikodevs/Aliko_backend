# AlikoHub Academy — WABON Regulatory Compliance Postman Guide

This guide details the complete Postman API collection for testing and validating all **Washington State Board of Nursing (WABON - WAC 246-841A-440)** regulatory compliance features, including admissions gating, orientation censuses, curriculum-textbook crosswalks, multi-criteria rubrics, discussions, study groups, active seat-time heartbeats, 22 core skills lab checkoffs, clinical shifts (1:10 ratio), exam security proctoring, instructor credentialing, course evaluations, tech support desk, gradebook calculations, graduation certificates, and compliance dossiers.

---

## 📁 Collection Files

- **Dedicated WABON Collection**: [`postman/AlikoHub_Academy_WABON_Compliance.postman_collection.json`](file:///c:/Users/X1/pro/1_Active/alikohub/Aliko_backend/postman/AlikoHub_Academy_WABON_Compliance.postman_collection.json)
- **Academy Service Copy**: [`apps/academy-service/AlikoHub_Academy_WABON_Compliance.postman_collection.json`](file:///c:/Users/X1/pro/1_Active/alikohub/Aliko_backend/apps/academy-service/AlikoHub_Academy_WABON_Compliance.postman_collection.json)
- **Merged Master Academy Collection**: [`apps/academy-service/AlikoHub-Academy-Backend.postman_collection.json`](file:///c:/Users/X1/pro/1_Active/alikohub/Aliko_backend/apps/academy-service/AlikoHub-Academy-Backend.postman_collection.json)
- **Postman Environment**: [`postman/AlikoHub_Academy_WABON_Compliance.postman_environment.json`](file:///c:/Users/X1/pro/1_Active/alikohub/Aliko_backend/postman/AlikoHub_Academy_WABON_Compliance.postman_environment.json)

---

## 🚀 Quick Start & Environment Setup

1. **Import** both the collection JSON and the environment JSON into Postman.
2. Select the **"AlikoHub WABON Compliance — Local Dev"** environment.
3. Set your `authToken` (or `studentToken`, `instructorToken`, `adminToken`) with valid JWTs from the Auth Service.
4. Set `baseUrl`:
   - Via API Gateway: `http://localhost:3000` (Default)
   - Directly to Academy Service: `http://localhost:3014/api/v1`

---

## 🔄 End-to-End Regulatory Execution Flow

```mermaid
flowchart TD
    A[1. Admissions Screening & E-Signature] --> B[2. Orientation Completion & Census]
    B --> C[3. Curriculum-Textbook Crosswalk]
    C --> D[4. Rubrics Setup & Configuration]
    D --> E[5. Discussion Topic & Substantive Interaction]
    E --> F[6. Peer Study Group Participation]
    F --> G[7. Active Seat-Time Heartbeats (60h)]
    G --> H[8. Skills Lab Competency Checkoffs (22 Skills)]
    H --> I[9. Clinical Shifts & 1:10 Ratio Enforcement (40h)]
    I --> J[10. Proctored Exam Sessions & Telemetry]
    J --> K[11. RN Instructor Credential Verification]
    K --> L[12. End-of-Course Evaluation Survey]
    L --> M[13. Support Desk Ticket & SLA Tracking]
    M --> N[14. Weighted Gradebook (80% Benchmark)]
    N --> O[15. WABON Completion Certificate & QR]
    O --> P[16. Regulatory Compliance Dossier Archive]
```

---

## 📋 Domains, Flows & Complete Payloads

### 1. Admissions & Statutory Screening Gate (WAC 246-841A-440(1))
* **Flow**:
  1. Student submits paperwork verification (`POST /api/v1/academy/admissions/submit`).
  2. Student e-signs statutory disclosures (`POST /api/v1/academy/admissions/sign-agreement`).
  3. Student verifies application status (`GET /api/v1/academy/admissions/my-application/:cohortId`).
  4. Instructor/Director inspects cohort queue (`GET /api/v1/academy/admissions/cohort/:cohortId`).
  5. Director approves admission, activating enrollment (`PATCH /api/v1/academy/admissions/review`).
* **Payload (Submit Application)**:
```json
{
  "cohortId": 1,
  "backgroundCheckUrl": "https://storage.alikohub.com/admissions/bg-check-001.pdf",
  "tbTestProofUrl": "https://storage.alikohub.com/admissions/tb-test-negative-2026.pdf",
  "immunizationProofUrl": "https://storage.alikohub.com/admissions/immunization-records.pdf",
  "cprCertUrl": "https://storage.alikohub.com/admissions/bls-cpr-aha-card.pdf",
  "idDocUrl": "https://storage.alikohub.com/admissions/wa-state-drivers-license.jpg",
  "highSchoolProofUrl": "https://storage.alikohub.com/admissions/high-school-diploma.pdf"
}
```

---

### 2. Orientation & Attendance Census (WAC 246-841A-440(2))
* **Flow**:
  1. Check orientation completion (`GET /api/v1/academy/orientation/status/:cohortId`).
  2. Submit completion checklist (`POST /api/v1/academy/orientation/complete`).
* **Payload**:
```json
{
  "cohortId": 1
}
```

---

### 3. Curriculum-Textbook Crosswalk (WAC 246-841A-440(3))
* **Flow**:
  1. Register textbook (`POST /api/v1/academy/curriculum-crosswalk/textbooks`).
  2. Map lesson reading (`POST /api/v1/academy/curriculum-crosswalk/readings`).
  3. Generate full crosswalk matrix (`GET /api/v1/academy/curriculum-crosswalk/matrix/course/:courseId`).
* **Payload (Assign Reading)**:
```json
{
  "lessonId": 1,
  "textbookId": 1,
  "chapterNumber": 12,
  "chapterTitle": "Infection Prevention and Control in Subacute Care",
  "pages": "145-168",
  "topicsCovered": [
    "Chain of Infection",
    "Standard Precautions",
    "Bloodborne Pathogens (OSHA)",
    "Donning and Doffing PPE"
  ]
}
```

---

### 4. Multi-Criteria Rubrics (User Interface Specification)
* **Flow**:
  1. Create multi-criteria rubric (`POST /api/v1/academy/rubrics`).
  2. Query rubrics (`GET /api/v1/academy/rubrics?type=DISCUSSION`).
  3. Clone rubric for new cohort (`POST /api/v1/academy/rubrics/:id/clone`).
  4. Evaluate submission against criteria levels (`POST /api/v1/academy/rubrics/evaluate`).
* **Payload (Create Rubric)**:
```json
{
  "name": "Clinical Judgment & Infection Control Rubric",
  "description": "Assesses critical thinking and adherence to CDC/OSHA infection control protocols.",
  "type": "DISCUSSION",
  "isActive": true,
  "criteria": [
    {
      "title": "Subject Mastery & WABON Core Knowledge",
      "description": "Demonstrates deep comprehension of standard precautions.",
      "maxPoints": 10,
      "order": 1,
      "levels": [
        {
          "name": "Exemplary",
          "description": "Flawlessly articulates all infection control principles.",
          "points": 10,
          "order": 1
        },
        {
          "name": "Competent",
          "description": "Identifies core safety precautions; minor gaps.",
          "points": 7,
          "order": 2
        }
      ]
    }
  ]
}
```

---

### 5. Discussion Forums & Substantive Interaction (WAC 246-841A-440(4))
* **Flow**:
  1. Instructor creates discussion topic linked to rubric (`POST /api/v1/academy/discussions/topics`).
  2. Student submits substantive post (`POST /api/v1/academy/discussions/posts`).
  3. Instructor grades post with feedback (`POST /api/v1/academy/discussions/posts/:postId/grade`).
* **Payload (Grade Post)**:
```json
{
  "grade": 15,
  "feedback": "Superb application of resident safety measures and SBAR escalation.",
  "isSubstantive": true
}
```

---

### 6. Cohort Study Groups (WAC 246-841A-440(5))
* **Flow**:
  1. Create peer group capped at 5 members (`POST /api/v1/academy/study-groups`).
  2. Other students join group (`POST /api/v1/academy/study-groups/join`).
  3. Update meeting schedule (`PATCH /api/v1/academy/study-groups/:id`).

---

### 7. Active Seat-Time Heartbeat Engine (WAC 246-841A-440(6))
* **Flow**:
  1. Client sends 30-60s active pulse (`POST /api/v1/academy/seat-time/heartbeat`).
  2. Cumulative 60-hour theory summary (`GET /api/v1/academy/seat-time/summary/course/:courseId`).
  3. Auditor cohort report (`GET /api/v1/academy/seat-time/cohort/:cohortId/report`).
* **Payload (Heartbeat)**:
```json
{
  "lessonId": 1,
  "courseId": 1,
  "intervalSeconds": 60,
  "engagementScore": 0.95,
  "interactionType": "VIDEO_PLAYBACK"
}
```

---

### 8. Skills Lab Competency Matrix (WAC 246-841A-440(7))
* **Flow**:
  1. Catalog 22 core NA skills (`POST /api/v1/academy/skills-lab/skills`).
  2. RN Instructor records checkoff attempt (`POST /api/v1/academy/skills-lab/checkoffs`).
  3. Query student competency matrix (`GET /api/v1/academy/skills-lab/matrix/student/:userId/cohort/:cohortId`).
* **Payload (Skill Checkoff)**:
```json
{
  "skillId": 1,
  "studentUserId": "{{studentUserId}}",
  "cohortId": 1,
  "status": "PASSED",
  "attemptNumber": 1,
  "criticalStepsCompleted": [
    "Wet hands and wrists thoroughly under running water.",
    "Lather with soap for at least 20 seconds.",
    "Clean under fingernails against palm.",
    "Rinse with fingertips pointing downward.",
    "Dry with clean towel.",
    "Turn off faucet with clean paper towel."
  ],
  "notes": "Demonstrated exceptional technique; zero recontamination.",
  "signatureUrl": "https://storage.alikohub.com/signatures/rn-evaluator.png"
}
```

---

### 9. Clinical Hours & 1:10 Ratio Enforcement (WAC 246-841A-440(8))
* **Flow**:
  1. Schedule clinical shift capped at 10 students (`POST /api/v1/academy/clinical/shifts`).
  2. Preceptor records student direct patient care hours (`POST /api/v1/academy/clinical/attendance`).
  3. Verify 40-hour requirement (`GET /api/v1/academy/clinical/hours/student/:userId/cohort/:cohortId`).

---

### 10. Exam Security & Proctoring (WAC 246-841A-440(9))
* **Flow**:
  1. Start exam session with webcam & ID photos (`POST /api/v1/academy/exam-security/sessions/start`).
  2. Telemetry logs window blur / tab switches (`POST /api/v1/academy/exam-security/sessions/tab-blur`).
  3. End session (`POST /api/v1/academy/exam-security/sessions/end`).
  4. Instructor audit & approval (`POST /api/v1/academy/exam-security/sessions/audit`).

---

### 11. Instructor Qualifications & RN Credentialing (WAC 246-841A-440(10))
* **Flow**:
  1. Register RN license, expiration, degrees (`POST /api/v1/academy/instructors/credentials`).
  2. Program Director approves instructor (`POST /api/v1/academy/instructors/approve`).
  3. Program-wide instructor registry (`GET /api/v1/academy/instructors/all`).

---

### 12. Course Quality Evaluations (WAC 246-841A-440(11))
* **Flow**:
  1. Student submits anonymous evaluation survey (`POST /api/v1/academy/evaluations/surveys`).
  2. Director views cohort analytics (`GET /api/v1/academy/evaluations/cohort/:cohortId`).

---

### 13. Technical Support Desk & SLA Tracking (WAC 246-841A-440(12))
* **Flow**:
  1. Retrieve minimum specs (`GET /api/v1/academy/support-desk/system-requirements`).
  2. Log support ticket (`POST /api/v1/academy/support-desk/tickets`).
  3. Update ticket resolution (`PATCH /api/v1/academy/support-desk/tickets/:id`).

---

### 14. Gradebook & 80% Benchmark Verification (WAC 246-841A-440(13))
* **Flow**:
  1. Query student grade report verifying 80% theory pass gate (`GET /api/v1/academy/gradebook/student/:cohortId`).
  2. Instructor cohort matrix (`GET /api/v1/academy/gradebook/cohort/:cohortId`).
  3. Export official CSV audit roster (`GET /api/v1/academy/gradebook/cohort/:cohortId/export-csv`).

---

### 15. Certification & QR Verification (WAC 246-841A-440(14))
* **Flow**:
  1. Issue WABON Certificate validating graduation gates (`POST /api/v1/academy/certification/generate`).
  2. Public / Employer verification (`POST /api/v1/academy/certification/verify`).

---

### 16. Regulatory Compliance Dossier (WAC 246-841A-440(15))
* **Flow**:
  1. Generate complete regulatory dossier archive assembling all logs and matrices (`POST /api/v1/academy/compliance-exporter/dossier`).

---

## 🧪 Automated Chaining & Dynamic Variables

Every creation request automatically parses the response and sets the corresponding Postman environment variable:
- `applicationId`
- `rubricId`
- `topicId`
- `postId`
- `studyGroupId`
- `skillId`
- `shiftId`
- `sessionId`
- `ticketId`
- `certificateNumber`

This enables the collection to run sequentially as a single test run using Postman Collection Runner or Newman:
```bash
npx newman run postman/AlikoHub_Academy_WABON_Compliance.postman_collection.json \
  -e postman/AlikoHub_Academy_WABON_Compliance.postman_environment.json
```
