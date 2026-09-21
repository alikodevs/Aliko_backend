# Con-Tech API Endpoint Documentation (New & Updated)

This document outlines the request and response payloads for the endpoints implemented/updated to close the platform's logic gaps.

---

## 1. Project Management

### `PATCH /projects/:id` (Updated)
Used for assigning core roles to a project.
**Request Payload:**
```json
{
  "clientId": "firebase_uid_123",
  "contractorId": "firebase_uid_456",
  "inspectorId": "firebase_uid_789",
  "budget": 500000,
  "location": "Addis Ababa, Site B"
}
```
**Response Payload:**
```json
{
  "id": 1,
  "name": "Project Alpha",
  "clientId": "firebase_uid_123",
  "contractorId": "firebase_uid_456",
  "inspectorId": "firebase_uid_789",
  "metadata": {
    "budget": 500000,
    "location": "Addis Ababa, Site B"
  },
  "status": "ACTIVE"
}
```

---

## 2. Task Management

### `PATCH /tasks/:id/assign` (New)
Assigns a specific user to a task.
**Request Payload:**
```json
{
  "userId": "firebase_uid_assignee"
}
```
**Response Payload:**
```json
{
  "id": 10,
  "projectId": 1,
  "title": "Foundation Reinforcement",
  "assignedTo": "firebase_uid_assignee",
  "status": "PENDING"
}
```

### `PATCH /tasks/:id/status` (New)
Updates the task progress within the workflow.
**Request Payload:**
```json
{
  "status": "IN_PROGRESS" 
}
// Valid statuses: TODO, PENDING, IN_PROGRESS, REVIEW, COMPLETED, BLOCKED
```
**Response Payload:**
```json
{
  "id": 10,
  "status": "IN_PROGRESS"
}
```

---

## 3. User Management

### `GET /admin/users` (Exposed)
Fetches users filtered by role for assignment dropdowns.
**Query Params:** `?role=CLIENT` (or CONTRACTOR, ADMIN)
**Response Payload:**
```json
{
  "items": [
    {
      "userId": "firebase_uid_123",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john@example.com",
      "role": "CLIENT",
      "companyName": "Aliko Construction"
    }
  ],
  "total": 1
}
```

### `PATCH /admin/users/:firebaseId` (New)
Administrative update of user profiles.
**Request Payload:**
```json
{
  "firstname": "John",
  "lastname": "Smith",
  "companyName": "Updated Corp",
  "role": "CONTRACTOR"
}
```
**Response Payload:**
```json
{
  "userId": "firebase_uid_123",
  "firstname": "John",
  "lastname": "Smith",
  "role": "CONTRACTOR",
  "status": "ACTIVE"
}
```

---

## 4. Inspection System

### `PATCH /inspections/:id/finalize` (New)
Submits the final result of an inspection.
**Request Payload:**
```json
{
  "status": "PASSED"
}
// Valid statuses: PASSED, FAILED, PENDING, SCHEDULED
```
**Response Payload:**
```json
{
  "id": 5,
  "projectId": 1,
  "status": "PASSED",
  "inspector": "firebase_uid_inspector"
}
```

---

## 5. Dashboard & Stats

### `GET /admin/dashboard` (Enhanced)
Provides aggregated construction metrics.
**Response Payload:**
```json
{
  "projectStats": {
    "total": 5,
    "active": 3,
    "completed": 1,
    "planned": 1,
    "overdueTasks": 2,
    "upcomingInspections": 4,
    "pendingContractsValue": 1250000.50
  },
  "users": {
    "clients": 12,
    "contractors": 45
  }
}
```
