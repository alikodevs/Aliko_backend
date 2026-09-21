# Con-Tech Service: Frontend Implementation Guide

This document provides everything a frontend developer needs to integrate with the **Con-Tech (Construction Technology)** service.

---

## 1. Authentication & Authorization

The Con-Tech service uses **Firebase Authentication** proxied through an API Gateway.

### Auth Flow
1.  **Frontend**: User logs in via Firebase SDK and obtains an `ID Token` (JWT).
2.  **API Gateway**: All requests must include the `Authorization: Bearer <ID_TOKEN>` header.
3.  **Role Syncing**: On the first login (or when requested), the backend syncs the user from the `AUTH_SERVICE` and creates a `ContechProfile`.
4.  **Role Selection**: A user can have one of three roles: `ADMIN`, `CONTRACTOR`, or `CLIENT`.

### Base URL
- **Production**: `https://con-tech.alikohub.com`
- **API Gateway (Internal)**: `http://localhost:3006/contech` (when working locally)

---

## 2. Global Data Models (Enums)

Use these enums to ensure type safety in your frontend components.

| Type | Values |
| :--- | :--- |
| **Roles** | `ADMIN`, `CONTRACTOR`, `CLIENT` |
| **Project Status** | `PLANNED`, `ACTIVE`, `ON_HOLD`, `DELAYED`, `COMPLETED`, `CANCELLED` |
| **Task Status** | `TODO`, `PENDING`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`, `BLOCKED` |
| **Milestone Status**| `PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED` |
| **Contract Status** | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `AMENDED`, `TERMINATED` |
| **Inspection Status**| `SCHEDULED`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED` |

---

## 3. Core API Modules

### 3.1 Proflies (`/profile`)
Manage user settings and roles.

- **GET `/profile`**: Fetch current user's profile and linked data.
- **POST `/profile/select-role`**: Set the user's role (Body: `{ "role": "CONTRACTOR" | "CLIENT" }`).
- **PUT `/profile`**: Update profile details (Body: `{ "bio": "...", "companyName": "..." }`).

### 3.2 Projects (`/projects`)
The heart of the application.

- **GET `/projects`**: List all projects accessible to the user.
- **GET `/projects/:id`**: Deep details of a project (includes relations).
- **POST `/projects`** `(ADMIN)`: Create a new project.
- **PATCH `/projects/:id`** `(ADMIN)`: Update project metadata.
- **PATCH `/projects/:id/status`**: Update `PLANNED` -> `ACTIVE` etc.
- **POST `/projects/:id/progress`**: Update numeric progress (0-100) and add notes.
- **POST `/projects/:id/updates`**: Create a project update (Weekly Summary).
- **POST `/projects/:id/documents`**: Multi-part upload for site plans, PDFs, etc.
- **GET `/projects/:id/comments`**: Fetch/Post project-level feedback.

### 3.3 Tasks (`/tasks`)
Detailed work items within a project.

- **GET `/tasks/project/:projectId`**: Fetch all tasks for a project.
- **POST `/tasks`**: Create a task (Assignee, Status, Deadline).
- **PATCH `/tasks/:id/progress`**: Update task completion % (0-100).

### 3.4 Contracts (`/contracts`)
Legal and financial documents.

- **GET `/contracts/project/:projectId`**: Fetch contracts.
- **POST `/contracts/upload`** `(ADMIN)`: Upload signed contract.
- **PATCH `/contracts/:id/status`**: Accept/Reject contract by Client or Admin.

### 3.5 Inspections (`/inspections`)
Site quality checks.

- **GET `/inspections/project/:projectId`**: List inspections.
- **POST `/inspections`** `(ADMIN/CONTRACTOR)`: Create an inspection report with checklist (JSON).

---

## 4. Business Logic Defaults

### Role-Based Permissions (RBAC)

| Resource | Admin | Contractor | Client |
| :------- | :---: | :--------: | :----: |
| Create Project | ✅ | ❌ | ❌ |
| Update Progress | ✅ | ✅ | ❌ |
| View Financials | ✅ | ❌ | ✅ |
| Upload Legal Docs| ✅ | ❌ | ❌ |
| View Site Photos| ✅ | ✅ | ✅ |
| Add Comments | ✅ | ✅ | ✅ |

### Key Logic Rules
1.  **Client Visibility**: Most items (Tasks, Updates, Documents) have an `isVisibleToClient` flag. Ensure your UI filters these out if the current user role is `CLIENT` and the flag is `false`.
2.  **Role Sync**: If a user is a Global Admin in the main system, they are automatically granted `ADMIN` status in Con-Tech.
3.  **Document Proofs**: Progress updates should ideally be accompanied by `photos` (URLs) stored in the `photos` array of the project/update.

---

## 5. Sample Component (Next.js/React)

```tsx
import { useEffect, useState } from 'react';

export const ProjectProgress = ({ projectId }) => {
  const [progress, setProgress] = useState(0);

  const updateProgress = async (newVal) => {
    const response = await fetch(`/api/contech/projects/${projectId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: newVal, notes: "Site update" })
    });
    if (response.ok) setProgress(newVal);
  };

  return (
    <div className="card">
      <h3>Project Statistics</h3>
      <input 
        type="range" 
        value={progress} 
        onChange={(e) => updateProgress(Number(e.target.value))} 
      />
      <span>{progress}% Completed</span>
    </div>
  );
};
```

---

## 6. Development Tools

- **Swagger Documentation**: [http://localhost:3006/api-docs/contech](http://localhost:3006/api-docs/contech)
- **Local Database (Prisma Studio)**: Run `npx prisma studio` in `domains/con-tech/backend` to view live data.
