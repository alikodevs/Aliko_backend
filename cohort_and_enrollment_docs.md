# AlikoHub Academy: Cohort & Enrollment Management Documentation

This document provides a comprehensive guideline for managing Cohorts and the separated Enrollment contexts (Self-Paced vs. Instructor-Led) within the AlikoHub Academy ecosystem.

---

## 1. System Architecture Overview
The system distinguishes between two primary learning paths:
1.  **Self-Paced (COURSE_ONLY):** Students enroll directly in a course. They progress at their own speed without being tied to a specific schedule or instructor-led group.
2.  **Instructor-Led (COHORT_BASED):** Students join a specific "Cohort" (e.g., "Fall 2024"). This context allows instructors to manage a specific group of students with defined start and end dates.

---

## 2. Database Schema (Prisma)

### Enrollment Table
The `Enrollment` model handles both contexts using the `context` field.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Int | Primary Key |
| `userId` | String | Firebase UID |
| `courseId` | Int | The associated Course ID (always present) |
| `cohortId` | Int? | The associated Cohort ID (null for self-paced) |
| `context` | Enum | `COURSE_ONLY` or `COHORT_BASED` |
| `cohortRole` | Enum | `STUDENT` or `TEACHING_ASSISTANT` |
| `approvalStatus` | Enum | `PENDING`, `APPROVED`, `REJECTED` |
| `status` | Enum | `ACTIVE`, `COMPLETED`, `DROPPED`, etc. |

### Supporting Enums
- **EnrollmentContext:** `{ COURSE_ONLY, COHORT_BASED }`
- **CohortRole:** `{ STUDENT, TEACHING_ASSISTANT }`
- **ApprovalStatus:** `{ PENDING, APPROVED, REJECTED }`

---

## 3. API Guidelines & Responses

### A. Cohort Management (Instructor/Admin Only)

#### Create Cohort
- **Endpoint:** `POST /academy/cohorts`
- **Request Body:**
  ```json
  {
    "name": "Spring 2024 Bootcamp",
    "courseId": 1,
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-06-01T00:00:00Z"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "id": 10,
    "name": "Spring 2024 Bootcamp",
    "courseId": 1,
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-06-01T00:00:00Z",
    "createdAt": "2026-03-24T..."
  }
  ```

#### Get All Cohorts (Paginated)
- **Endpoint:** `GET /academy/cohorts?courseId=1&page=1&pageSize=10`
- **Success Response (200):**
  ```json
  {
    "items": [...],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
  ```

---

### B. Enrollment Management (Student/Admin)

#### Enroll in Course (Self-Paced)
- **Endpoint:** `POST /academy/enrollment/course/:courseId`
- **Scenario:** Use this for users who want immediate, unstructured access to the course content.
- **Success Response (201):**
  ```json
  {
    "id": 1,
    "userId": "5DSw8oxbeGRzqCmGaBnrbO7orI12",
    "cohortId": null,
    "courseId": 1,
    "context": "COURSE_ONLY",
    "cohortRole": "STUDENT",
    "approvalStatus": "APPROVED",
    "status": "ACTIVE"
  }
  ```

#### Enroll in Cohort (Instructor-Led)
- **Endpoint:** `POST /academy/enrollment/cohort/:cohortId`
- **Request Body:**
  ```json
  { "courseId": 1 }
  ```
- **Scenario:** Use this for enrollment into a specific group with a schedule.
- **Success Response (201):**
  ```json
  {
    "id": 2,
    "userId": "5DSw8oxbeGRzqCmGaBnrbO7orI12",
    "cohortId": 1,
    "courseId": 1,
    "context": "COHORT_BASED",
    "cohortRole": "STUDENT",
    "approvalStatus": "APPROVED",
    "status": "ACTIVE"
  }
  ```

#### Get My Enrollments
- **Endpoint:** `GET /academy/enrollment/my`
- **Success Response (200):**
  ```json
  [
    {
      "id": 1,
      "context": "COURSE_ONLY",
      "course": { "id": 1, "title": "Test Course" }
    },
    {
      "id": 2,
      "context": "COHORT_BASED",
      "cohortId": 1,
      "course": { "id": 1, "title": "Test Course" }
    }
  ]
  ```

---

## 4. Implementation Walkthrough Summary

The implementation focused on ensuring that "joining a course" and "joining a cohort" are functionally and architecturally distinct while sharing the same underlying progress tracking system.

1.  **Phase 1: Database Revamp:** We introduced enums to the Prisma schema to provide type-safety for enrollment types.
2.  **Phase 2: Microservice Logic:** The `enrollments.service.ts` was updated to intercept enrollment requests. If a `cohortId` is detected, it handles the logic as a cohort enrollment; otherwise, it defaults to a self-paced course enrollment.
3.  **Phase 3: API Gateway Separation:** Previously, a generic POST was used. We introduced specific routes (`/course/:id` and `/cohort/:id`) to the Gateway to allow the Frontend to explicitly call the correct business logic.
4.  **Phase 4: Verification:** Testing confirmed that the database correctly stores `null` for cohort IDs in self-paced mode and strict IDs in cohort mode, with the `context` field acting as a reliable flag for reporting.

---

## 5. Deployment Notes
After any changes to the enrollment schema:
1. Run `npx prisma migrate dev` (locally) or `npx prisma db push` (docker) to sync the DB.
2. Re-generate the Prisma client using `npx prisma generate`.
3. Restart the `academy-service` and `api-gateway` containers.
