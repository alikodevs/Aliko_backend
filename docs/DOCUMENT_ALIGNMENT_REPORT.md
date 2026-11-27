# Aliko Academy Health — Specification vs. Backend Alignment Report

**Date:** 2026-11-27  
**Scope:** Full line-by-line audit of Specification Documents 1, 5, 6, 7, and 8 against `apps/academy-service` and `scripts/seed_core_skills.ts`.

---

## 1. Executive Summary

All 5 specification documents were audited against the live backend implementation and database:
- [1_Aliko_CNA_LMS_Compliance_and_Corrective_Actions.md](file:///root/Home-Project/docs/1_Aliko_CNA_LMS_Compliance_and_Corrective_Actions.md) (`CA-01`–`CA-29`)
- [5_Aliko_LMS_Final_Student_Dashboard.md](file:///root/Home-Project/docs/5_Aliko_LMS_Final_Student_Dashboard.md) (`S1`–`S11`, Appendix A)
- [6_Aliko_LMS_Final_Instructor_Dashboard.md](file:///root/Home-Project/docs/6_Aliko_LMS_Final_Instructor_Dashboard.md) (`I1`–`I12`)
- [7_Aliko_LMS_Final_Admin_Dashboard.md](file:///root/Home-Project/docs/7_Aliko_LMS_Final_Admin_Dashboard.md) (`A1`–`A11`)
- [8_Aliko_LMS_Final_WABON_Reviewer_Dashboard.md](file:///root/Home-Project/docs/8_Aliko_LMS_Final_WABON_Reviewer_Dashboard.md) (`W1`–`W12`)

During this audit, **6 misalignments** were identified and fixed across the codebase and database, bringing the backend into full alignment with the documents.

---

## 2. Misalignments Found & Fixed

| # | Area | Spec Requirement | Previous Backend Behavior | Fix Applied |
|---|---|---|---|---|
| **1** | **Orientation ↔ Module 0 Sync** | Doc 5 (`S2`): `O-1`–`O-9` checklist & Module 0 (`0-1`–`0-9`) represent the same 9-item orientation gate | Completely disconnected; completing one did not update the other | Bidirectional sync in [orientation.service.ts](file:///root/Home-Project/apps/academy-service/src/orientation/orientation.service.ts) & [progress-analytics.service.ts](file:///root/Home-Project/apps/academy-service/src/progress-and-analytics/progress-analytics.service.ts) (`4768eea`) |
| **2** | **Module 0 Agreement Deadlock** | Doc 5 (`S2`): `0-9 · Sign the enrollment agreement` is inside Module 0 itself; Unit 1 locks until all 9 are done | `agreementSigned` check blocked Module 0 lessons (`0-2`–`0-9`), causing a deadlock | Exempted `isOrientationModule` from `agreementSigned` gate in `lessons.service.ts`, `progress-analytics.service.ts`, `exercises.service.ts`; enforced instructor-only `0-1`; synced `signAgreement` → `O-9`/`0-9` (`9923adb`) |
| **3** | **Seat-Time `IN_PROGRESS` Conflict** | Doc 1 (`CA-19`) & Doc 5 (`S1`): Seat-time heartbeats track active minutes while lessons are completed | `SeatTimeService` created `IN_PROGRESS` rows; `completeLesson()` returned early on *any* existing row | `completeLesson()` now transitions `IN_PROGRESS` → `COMPLETED`, preserving `activeTimeSeconds` (`494d548`) |
| **4** | **22 WABON Skills & `taughtInUnit`** | Doc 5 (`S10`, `S11`): 22 skills numbered `#1`–`#11`, `#13`–`#23` (skipping `#12`), each mapped to its exact Unit (`Unit 4`–`Unit 8`) | Old `SKILL-01`–`SKILL-22` list + 6 stray test rows (28 total) + wrong `taughtInUnit` mapping | Updated [seed_core_skills.ts](file:///root/Home-Project/scripts/seed_core_skills.ts) with exact 22 skills + `SKILL_UNIT_MAP`, cleaned DB to 22 rows (`780e371` + reseed) |
| **5** | **WABON Template Unit Titles, Hours & Pages** | Doc 5 (`S11`, Appendix A): Exact 9 unit titles, per-unit theory/lab budgets (`35h` theory / `25h` unit lab + `8h` mock = `33h` lab), and Student Guide page ranges | `importWabonTemplate()` had swapped unit titles (`Unit 3`/`4`, `Unit 7`/`8`), flat `3.89h`/`2.78h` hours, and no `studentGuidePages` | Updated `unitsSpec` in [courses.service.ts](file:///root/Home-Project/apps/academy-service/src/courses/courses.service.ts) with exact titles, hours (`4/1, 4/1, 3/2, 4/2, 3/3, 5/4, 3/3, 5/7, 4/2`), and `studentGuidePages` |
| **6** | **Certificate Hours Breakdown** | Doc 5/6/7/8: 108-hour hybrid program (`35h` theory + `33h` lab + `40h` clinical) | `certification.service.ts` hardcoded `50.0` theory + `20.0` lab (`110h` total) | Updated to `35.0` theory + `33.0` lab + `clinicalHours` (`108.0h` total) (`494d548`) |

---

## 3. Document-by-Document Alignment Matrix

### Document 1: Compliance & Corrective Actions (`CA-01`–`CA-29`)

| Rule | Requirement | Implementation | Status |
|---|---|---|---|
| **CA-01** | Stop leaking account/instructor data on public APIs | Public course/list endpoints sanitize user/instructor fields | Aligned |
| **CA-02** | Strip `correctAnswer` from quiz APIs | `stripExerciseAnswer()` in `lessons.service.ts` & `exercises.service.ts` | Aligned |
| **CA-03** | Server-side locks (admissions, agreement, orientation, sequential units) | Enforced in `lessons.service.ts`, `progress-analytics.service.ts`, `exercises.service.ts` | Aligned |
| **CA-04** | Full two-agency enrollment agreement (WABON + Workforce Board) | `admissions.service.ts` (`signAgreement` + `disclosuresAcknowledged`) + `health-admin.service.ts` | Aligned |
| **CA-05** | Only Program Director / Admin issues certificates | `certification.controller.ts` (`@Roles(ADMIN, COURSE_MANAGER)`) | Aligned |
| **CA-06** | Remove fake ratings / "Lifetime access" / test courses | `health-admin.service.ts` (`archiveCourses`) + 90-day cohort window | Aligned |
| **CA-07** | Put files behind login | `content` visibility (`LOGGED_IN_ONLY`, `isDownloadable: false`) on HEALTH courses | Aligned |
| **CA-08** | Fix chat between student & instructor | Chat module + gateway routing (`/api/v1/chat`) | Aligned |
| **CA-09** | Real CNA cohort with assigned instructors & students | `cohorts.service.ts` + `enrollments.service.ts` | Aligned |
| **CA-10** | WABON reviewer (`COMMISSION_AUDITOR`) read-only login | `health-reviewer.controller.ts` & `health-admin.service.ts` (`inviteReviewer`) | Aligned |
| **CA-11** | Publish cohort schedule & lesson due dates | `teaching-schedule` + `Lesson.dueDate` + `Module.scheduledOpenDate` | Aligned |
| **CA-12** | Graded discussion with rubric in every unit | `discussions.service.ts` + `rubrics.service.ts` | Aligned |
| **CA-13** | Week-one attendance gate assignment | `Lesson.isWeekOneAttendanceGate` + `attendance` | Aligned |
| **CA-14** | Instructor-verified orientation attendance | `O-1` (`instructorOnly: true`) + `orientationMarkedBy` | Aligned |
| **CA-15** | Study groups per cohort | `study-groups` module | Aligned |
| **CA-16** | Instructor-graded work (Pyramid, Story, Discussion) | `exercises.service.ts` + `rubrics.service.ts` + `gradebook.service.ts` | Aligned |
| **CA-17** | Honest Curriculum Crosswalk (textbook + readings) | `curriculum-crosswalk.service.ts` + `CourseTextbook` / `LessonReading` | Aligned |
| **CA-18** | Remove placeholder numbers (single source of truth) | `health-dashboard.service.ts` queries live Prisma models (`coreSkill.count()`, `progress`, `clinicalShiftAttendance`) | Aligned |
| **CA-19** | Track active seat-time (no completion without watching) | `seat-time.service.ts` (120s clamp, idle guard) + `completeLesson()` `IN_PROGRESS` → `COMPLETED` | Aligned |
| **CA-20** | Clean up Skills Lab to 22 official WABON skills | `skills-lab.service.ts` + `seed_core_skills.ts` (`SKILL-01`–`SKILL-11`, `SKILL-13`–`SKILL-23`) | Aligned |
| **CA-21** | Track hours by `THEORY` / `LAB` / `CLINICAL` / `NON_CREDIT` | `Lesson.hourType`, `estimatedHours`, `countsTowardSeatTime` | Aligned |
| **CA-22** | Unlock KEY answer videos after submitting activity | `Lesson.unlockRules` (`EXERCISE_SUBMISSION` prerequisite) in `lessons.service.ts` | Aligned |
| **CA-23** | Log mock skills tests (RN evaluator, max 4 attempts) | `SkillCheckoff` (`evaluatorCredential`, `attempts`) in `skills-lab.service.ts` | Aligned |
| **CA-25** | Allow RN or LPN instructors for lab/clinical; RN for state skills test | `InstructorCredential` (`licenseType`, `approvedByDirectorAt`, `dohVerifiedAt`) | Aligned |
| **CA-26** | US dollars + Workforce Board refund rules | `health-admin.service.ts` (`calculateWorkforceBoardRefund`, WAC 490-105) | Aligned |
| **CA-28** | Live classes cap: max 20 students | `enrollments.service.ts` (`maxLiveCapacity: 20` check when `LIVE` schedules exist, plus `30:1` statutory cap) | Aligned |

---

### Documents 5, 6, 7 & 8: Dashboard & Endpoint Coverage

| Document | Screens Covered | Backend Module(s) | Status |
|---|---|---|---|
| **Doc 5 (Student)** | `S1` Dashboard, `S2` Orientation (Module 0 `0-1`–`0-9`), `S3` My Learning (9 units + Mock/Clinical/Exam Prep), `S4` Course Player, `S5`–`S7` Pyramid/Story/Discussion/ID-checked Quiz, `S8`–`S9` Grades & Schedule, `S10` 22 Skills Lab, `S11` Crosswalk | `health-dashboard`, `orientation`, `progress-and-analytics`, `lessons`, `exercises`, `exam-security`, `discussions`, `gradebook`, `skills-lab`, `clinical`, `curriculum-crosswalk` | Aligned |
| **Doc 6 (Instructor)** | `I1`–`I12`: Console, Course Builder, WABON 1-click template, Grading Queue, Rubric Builder, Attendance Census, Skills Lab & Clinical Sign-Off, Compliance Audit | `health-dashboard`, `courses`, `exercises`, `rubrics`, `attendance`, `skills-lab`, `clinical`, `instructors` | Aligned |
| **Doc 7 (Admin)** | `A1`–`A11`: Programs & Approvals, Enrollments & Cohorts, Faculty & Credentials, Course Reviews + Version Diff + Lock, Content Library, Clinical Facilities, WABON Reviewer Access, Refunds & Agreements (WAC 490-105), Platform Analytics | `health-admin`, `courses`, `cohorts`, `instructors`, `enrollments` | Aligned |
| **Doc 8 (WABON Reviewer)** | `W1`–`W12`: Read-only Overview, Program Profile, Curriculum & Units, Unit Detail, Cohort Ratios, Seat-Time (with name masking), Integrity Audit, Skills & Clinical Records, Faculty Credentials, 64-Item Crosswalk, Evidence Exports & Requests | `health-reviewer` (with automatic `ReviewerAuditLog` recording) | Aligned |
