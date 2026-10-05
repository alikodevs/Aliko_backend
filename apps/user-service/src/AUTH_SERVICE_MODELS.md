# Auth Service - Prisma Models

This document provides a complete reference of all Prisma models, enums, and database schema for the auth-service.

---

## Table of Contents

1. [Database Configuration](#database-configuration)
2. [Models](#models)
3. [Enums](#enums)
4. [Relationships](#relationships)
5. [Indexes & Constraints](#indexes--constraints)
6. [Usage Examples](#usage-examples)

---

## Database Configuration

**Provider:** PostgreSQL

**Environment Variable:** `DATABASE_URL`

**Prisma Client Configuration:**
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Models

### Overview

The auth-service now includes 5 core models:

1. **User** - Global user with Firebase integration
2. **Application** - Role application workflow
3. **SubdomainEnrollment** - Tracks user enrollment in subdomains
4. **ConsultancyUser** - Consultancy-specific user data
5. **AcademyUser** - Academy-specific user data
6. **ContechUser** - ConTech-specific user data
7. **EventsUser** - Events-specific user data

---

### 1. User Model

**Purpose:** Stores authenticated users with global role and profile information

**Schema:**

```prisma
model User {
  id             Int        @id @default(autoincrement())
  firebaseId     String     @unique
  firstname      String
  lastname       String?
  email          String     @unique
  password       String?
  globalRole     GlobalRole @default(USER)
  profilePicture String?
  bio            String?
  status         String     @default("ACTIVE")
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  application Application[]
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | Int | ✅ | ✅ | auto-increment | Primary key |
| `firebaseId` | String | ✅ | ✅ | - | Firebase UID (unique identifier) |
| `firstname` | String | ✅ | ❌ | - | User's first name |
| `lastname` | String | ❌ | ❌ | - | User's last name (optional) |
| `email` | String | ✅ | ✅ | - | Email address (unique) |
| `password` | String | ❌ | ❌ | - | Argon2 hashed password (optional) |
| `globalRole` | GlobalRole | ✅ | ❌ | USER | Global platform role (USER or ADMIN) |
| `profilePicture` | String | ❌ | ❌ | - | URL to profile picture (optional) |
| `bio` | String | ❌ | ❌ | - | User biography (optional) |
| `status` | String | ✅ | ❌ | ACTIVE | Account status (ACTIVE, INACTIVE, SUSPENDED) |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when user was created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

**Relations:**
- One-to-Many: `application` → Multiple `Application` records
- One-to-One: `consultancyUser` → `ConsultancyUser` record
- One-to-One: `academyUser` → `AcademyUser` record
- One-to-One: `contechUser` → `ContechUser` record
- One-to-One: `eventsUser` → `EventsUser` record
- One-to-Many: `subdomainEnrollments` → Multiple `SubdomainEnrollment` records

**Indexes:**
- Primary Key: `id`
- Unique: `firebaseId`
- Unique: `email`

**Example Usage:**

```typescript
// Create a new user
const user = await prisma.user.create({
  data: {
    firebaseId: 'firebase-uid-123',
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com',
    password: 'hashed-password-with-argon2',
    globalRole: 'USER',
    status: 'ACTIVE',
  },
});

// Find user by Firebase ID
const user = await prisma.user.findUnique({
  where: { firebaseId: 'firebase-uid-123' },
});

// Find user by email
const user = await prisma.user.findUnique({
  where: { email: 'john@example.com' },
});

// Update user profile
const updated = await prisma.user.update({
  where: { firebaseId: 'firebase-uid-123' },
  data: {
    profilePicture: 'https://example.com/pic.jpg',
    bio: 'Software engineer',
  },
});

// Find user with applications
const user = await prisma.user.findUnique({
  where: { firebaseId: 'firebase-uid-123' },
  include: { application: true },
});

// Promote user to ADMIN
const admin = await prisma.user.update({
  where: { firebaseId: 'firebase-uid-123' },
  data: { globalRole: 'ADMIN' },
});

// Suspend user account
const suspended = await prisma.user.update({
  where: { firebaseId: 'firebase-uid-123' },
  data: { status: 'SUSPENDED' },
});
```

---

### 2. Application Model

**Purpose:** Tracks user applications for subdomain-specific roles (e.g., applying to be an instructor, advisor, etc.)

**Schema:**

```prisma
model Application {
  id            Int    @id @default(autoincrement())
  userId        String
  user          User   @relation(fields: [userId], references: [firebaseId])
  domain        String
  requestedRole String

  formData    Json
  status      ApplicationStatus @default(PENDING)
  reviewedBy  String?
  reviewNotes String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([userId, domain])
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | Int | ✅ | ✅ | auto-increment | Primary key |
| `userId` | String | ✅ | ❌ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `domain` | String | ✅ | ❌ | - | Subdomain (academy, consultancy, contech, events) |
| `requestedRole` | String | ✅ | ❌ | - | Role being applied for (e.g., INSTRUCTOR, ADVISOR) |
| `formData` | Json | ✅ | ❌ | - | JSON object with application form data |
| `status` | ApplicationStatus | ✅ | ❌ | PENDING | Application status (PENDING, APPROVED, REJECTED) |
| `reviewedBy` | String | ❌ | ❌ | - | Firebase ID of reviewer (optional) |
| `reviewNotes` | String | ❌ | ❌ | - | Notes from reviewer (optional) |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when application was created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

**Constraints:**
- Foreign Key: `userId` references `User(firebaseId)` with `ON DELETE RESTRICT ON UPDATE CASCADE`
- Unique Composite: `userId` + `domain` (user can only have one application per domain)

**Indexes:**
- Primary Key: `id`
- Unique: `userId, domain`
- Foreign Key: `userId`

**Example Usage:**

```typescript
// Create an application
const application = await prisma.application.create({
  data: {
    userId: 'firebase-uid-123',
    domain: 'academy',
    requestedRole: 'INSTRUCTOR',
    formData: {
      experience: '5 years',
      specialization: 'Web Development',
      qualifications: ['BS Computer Science', 'AWS Certified'],
    },
    status: 'PENDING',
  },
});

// Find pending applications
const pending = await prisma.application.findMany({
  where: { status: 'PENDING' },
  include: { user: true },
});

// Find user's applications
const userApps = await prisma.application.findMany({
  where: { userId: 'firebase-uid-123' },
});

// Find application for specific domain
const app = await prisma.application.findUnique({
  where: {
    userId_domain: {
      userId: 'firebase-uid-123',
      domain: 'academy',
    },
  },
});

// Approve application
const approved = await prisma.application.update({
  where: { id: 1 },
  data: {
    status: 'APPROVED',
    reviewedBy: 'admin-firebase-id',
    reviewNotes: 'Excellent qualifications',
  },
});

// Reject application
const rejected = await prisma.application.update({
  where: { id: 1 },
  data: {
    status: 'REJECTED',
    reviewedBy: 'admin-firebase-id',
    reviewNotes: 'Does not meet minimum requirements',
  },
});

// Get all applications for a domain
const domainApps = await prisma.application.findMany({
  where: { domain: 'academy' },
  include: { user: true },
  orderBy: { createdAt: 'desc' },
});

// Count pending applications
const count = await prisma.application.count({
  where: { status: 'PENDING' },
});
```

---

### 3. SubdomainEnrollment Model

**Purpose:** Tracks which subdomains a user is enrolled in and their role in each

**Schema:**

```prisma
model SubdomainEnrollment {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [firebaseId])
  subdomain   String
  role        String
  enrolledAt  DateTime @default(now())
  status      String   @default("ACTIVE")

  @@unique([userId, subdomain])
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | String | ✅ | ✅ | cuid() | Primary key |
| `userId` | String | ✅ | ❌ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `subdomain` | String | ✅ | ❌ | - | Subdomain name (academy, consultancy, contech, events) |
| `role` | String | ✅ | ❌ | - | Role in that subdomain |
| `enrolledAt` | DateTime | ✅ | ❌ | now() | Timestamp when enrolled |
| `status` | String | ✅ | ❌ | ACTIVE | Enrollment status (ACTIVE, INACTIVE) |

**Constraints:**
- Unique Composite: `userId` + `subdomain` (one enrollment per user per subdomain)

**Example Usage:**

```typescript
// Create enrollment
const enrollment = await prisma.subdomainEnrollment.create({
  data: {
    userId: 'firebase-uid-123',
    subdomain: 'academy',
    role: 'STUDENT',
  },
});

// Find user's subdomains
const subdomains = await prisma.subdomainEnrollment.findMany({
  where: { userId: 'firebase-uid-123' },
});

// Check if user has access to subdomain
const enrollment = await prisma.subdomainEnrollment.findUnique({
  where: {
    userId_subdomain: {
      userId: 'firebase-uid-123',
      subdomain: 'academy',
    },
  },
});
```

---

### 4. ConsultancyUser Model

**Purpose:** Stores consultancy-specific user data and roles

**Schema:**

```prisma
model ConsultancyUser {
  id              String      @id @default(cuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [firebaseId])
  role            ConsultancyRole
  university      String?
  country         String?
  educationLevel  String?
  specialization  String?
  status          String      @default("ACTIVE")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | String | ✅ | ✅ | cuid() | Primary key |
| `userId` | String | ✅ | ✅ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `role` | ConsultancyRole | ✅ | ❌ | - | Consultancy role (STUDENT, ADVISOR, PARTNER_INSTITUTION, CONSULTANCY_ADMIN) |
| `university` | String | ❌ | ❌ | - | University name (for partner institutions) |
| `country` | String | ❌ | ❌ | - | User's country (for students) |
| `educationLevel` | String | ❌ | ❌ | - | Education level (Bachelor's, Master's, etc.) |
| `specialization` | String | ❌ | ❌ | - | Specialization (for advisors) |
| `status` | String | ✅ | ❌ | ACTIVE | Account status |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

---

### 5. AcademyUser Model

**Purpose:** Stores academy-specific user data and roles

**Schema:**

```prisma
model AcademyUser {
  id              String      @id @default(cuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [firebaseId])
  role            AcademyRole
  specialization  String?
  enrolledCourses String[]
  certifications  String[]
  status          String      @default("ACTIVE")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | String | ✅ | ✅ | cuid() | Primary key |
| `userId` | String | ✅ | ✅ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `role` | AcademyRole | ✅ | ❌ | - | Academy role (STUDENT, INSTRUCTOR, COURSE_MANAGER, ACADEMY_ADMIN) |
| `specialization` | String | ❌ | ❌ | - | Specialization (e.g., Web Development) |
| `enrolledCourses` | String[] | ✅ | ❌ | [] | Array of enrolled course IDs |
| `certifications` | String[] | ✅ | ❌ | [] | Array of earned certification IDs |
| `status` | String | ✅ | ❌ | ACTIVE | Account status |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

---

### 6. ContechUser Model

**Purpose:** Stores ConTech-specific user data and roles

**Schema:**

```prisma
model ContechUser {
  id              String      @id @default(cuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [firebaseId])
  role            ContechRole
  company         String?
  projects        String[]
  status          String      @default("ACTIVE")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | String | ✅ | ✅ | cuid() | Primary key |
| `userId` | String | ✅ | ✅ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `role` | ContechRole | ✅ | ❌ | - | ConTech role (CLIENT, CONTRACTOR, PROJECT_MANAGER, STAKEHOLDER, CONTECH_ADMIN) |
| `company` | String | ❌ | ❌ | - | Company name |
| `projects` | String[] | ✅ | ❌ | [] | Array of associated project IDs |
| `status` | String | ✅ | ❌ | ACTIVE | Account status |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

---

### 7. EventsUser Model

**Purpose:** Stores Events-specific user data and roles

**Schema:**

```prisma
model EventsUser {
  id              String      @id @default(cuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [firebaseId])
  role            EventsRole
  company         String?
  registeredEvents String[]
  status          String      @default("ACTIVE")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

**Fields:**

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `id` | String | ✅ | ✅ | cuid() | Primary key |
| `userId` | String | ✅ | ✅ | - | Foreign key to User (firebaseId) |
| `user` | User | ✅ | ❌ | - | Relation to User model |
| `role` | EventsRole | ✅ | ❌ | - | Events role (ATTENDEE, ORGANIZER, SPONSOR, EVENTS_ADMIN) |
| `company` | String | ❌ | ❌ | - | Company name (for sponsors) |
| `registeredEvents` | String[] | ✅ | ❌ | [] | Array of registered event IDs |
| `status` | String | ✅ | ❌ | ACTIVE | Account status |
| `createdAt` | DateTime | ✅ | ❌ | now() | Timestamp when created |
| `updatedAt` | DateTime | ✅ | ❌ | - | Timestamp of last update |

---

## Enums

### 1. GlobalRole

**Purpose:** Defines global platform roles for all users

**Values:**

```prisma
enum GlobalRole {
  USER   // Standard authenticated user
  ADMIN  // Platform administrator
}
```

**Usage:**

```typescript
// Create ADMIN user
const admin = await prisma.user.create({
  data: {
    firebaseId: 'admin-uid',
    firstname: 'Admin',
    email: 'admin@aliko.com',
    globalRole: 'ADMIN',
  },
});

// Check if user is admin
if (user.globalRole === 'ADMIN') {
  // Grant admin permissions
}

// Filter admins
const admins = await prisma.user.findMany({
  where: { globalRole: 'ADMIN' },
});
```

---

### 2. ApplicationStatus

**Purpose:** Defines possible states for role applications

**Values:**

```prisma
enum ApplicationStatus {
  PENDING   // Application submitted, awaiting review
  APPROVED  // Application approved, role granted
  REJECTED  // Application rejected
}
```

---

### 3. ConsultancyRole

**Purpose:** Defines roles within the Consultancy subdomain

**Values:**

```prisma
enum ConsultancyRole {
  STUDENT              // Prospective or returning student
  ADVISOR              // Educational consultant/staff
  PARTNER_INSTITUTION  // University or educational partner
  CONSULTANCY_ADMIN    // Subdomain administrator
}
```

---

### 4. AcademyRole

**Purpose:** Defines roles within the Academy subdomain

**Values:**

```prisma
enum AcademyRole {
  STUDENT         // Enrolled learner
  INSTRUCTOR      // Course educator
  COURSE_MANAGER  // Curriculum administrator
  ACADEMY_ADMIN   // Subdomain administrator
}
```

---

### 5. ContechRole

**Purpose:** Defines roles within the ConTech subdomain

**Values:**

```prisma
enum ContechRole {
  CLIENT           // Project client/end-user
  CONTRACTOR       // Service provider
  PROJECT_MANAGER  // Project lead
  STAKEHOLDER      // Investor or decision-maker
  CONTECH_ADMIN    // Subdomain administrator
}
```

---

### 6. EventsRole

**Purpose:** Defines roles within the Events subdomain

**Values:**

```prisma
enum EventsRole {
  ATTENDEE      // Event participant
  ORGANIZER     // Event staff/organizer
  SPONSOR       // Business sponsor
  EVENTS_ADMIN  // Subdomain administrator
}
```

**Usage:**

```typescript
// Create pending application
const app = await prisma.application.create({
  data: {
    userId: 'user-id',
    domain: 'academy',
    requestedRole: 'INSTRUCTOR',
    formData: { /* ... */ },
    status: 'PENDING',
  },
});

// Filter by status
const pending = await prisma.application.findMany({
  where: { status: 'PENDING' },
});

const approved = await prisma.application.findMany({
  where: { status: 'APPROVED' },
});

// Update status
await prisma.application.update({
  where: { id: 1 },
  data: { status: 'APPROVED' },
});
```

---

## Relationships

### User → Application (One-to-Many)

**Direction:** One User has many Applications

**Implementation:**

```prisma
model User {
  // ...
  application Application[]  // One user can have multiple applications
}

model Application {
  // ...
  userId String
  user   User @relation(fields: [userId], references: [firebaseId])
}
```

**Cascade Behavior:**
- `ON DELETE RESTRICT`: Cannot delete user if they have applications
- `ON UPDATE CASCADE`: If user's firebaseId changes, applications update automatically

**Query Examples:**

```typescript
// Get user with all their applications
const user = await prisma.user.findUnique({
  where: { firebaseId: 'user-id' },
  include: { application: true },
});

// Get application with user details
const app = await prisma.application.findUnique({
  where: { id: 1 },
  include: { user: true },
});

// Create user with applications
const user = await prisma.user.create({
  data: {
    firebaseId: 'user-id',
    firstname: 'John',
    email: 'john@example.com',
    application: {
      create: [
        {
          domain: 'academy',
          requestedRole: 'INSTRUCTOR',
          formData: { /* ... */ },
        },
      ],
    },
  },
});

// Delete all applications for a user
await prisma.application.deleteMany({
  where: { userId: 'user-id' },
});
```

---

## Indexes & Constraints

### Primary Keys

| Model | Field | Type |
|-------|-------|------|
| User | `id` | Auto-increment Int |
| Application | `id` | Auto-increment Int |

### Unique Constraints

| Model | Field(s) | Purpose |
|-------|----------|---------|
| User | `firebaseId` | Ensure each Firebase user maps to one DB user |
| User | `email` | Prevent duplicate email registrations |
| Application | `userId, domain` | One application per user per domain |

### Foreign Keys

| Model | Field | References | Behavior |
|-------|-------|-----------|----------|
| Application | `userId` | User(firebaseId) | ON DELETE RESTRICT, ON UPDATE CASCADE |

### Query Performance

**Recommended Indexes (already created):**

```sql
-- Primary keys (auto-indexed)
CREATE UNIQUE INDEX "User_pkey" ON "public"."User"("id");
CREATE UNIQUE INDEX "Application_pkey" ON "public"."Application"("id");

-- Unique constraints (auto-indexed)
CREATE UNIQUE INDEX "User_firebaseId_key" ON "public"."User"("firebaseId");
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");
CREATE UNIQUE INDEX "Application_userId_domain_key" ON "public"."Application"("userId", "domain");

-- Foreign key (auto-indexed)
CREATE INDEX "Application_userId_fkey" ON "public"."Application"("userId");
```

---

## Usage Examples

### Complete User Registration Flow

```typescript
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async registerUser(dto: SignUpDto) {
    // Hash password
    const hash = await argon.hash(dto.password);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        firebaseId: firebaseUid, // From Firebase
        firstname: dto.firstname,
        lastname: dto.lastname,
        email: dto.email,
        password: hash,
        globalRole: isFirstUser ? 'ADMIN' : 'USER',
        status: 'ACTIVE',
      },
    });

    return user;
  }

  async findUserByFirebaseId(firebaseId: string) {
    return await this.prisma.user.findUnique({
      where: { firebaseId },
      include: { application: true },
    });
  }

  async updateUserProfile(firebaseId: string, updateDto: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { firebaseId },
      data: {
        profilePicture: updateDto.profilePicture,
        bio: updateDto.bio,
      },
    });
  }
}
```

### Application Management Flow

```typescript
@Injectable()
export class ApplicationService {
  constructor(private prisma: PrismaService) {}

  async submitApplication(userId: string, dto: SubmitApplicationDto) {
    // Check if user already has application for this domain
    const existing = await this.prisma.application.findUnique({
      where: {
        userId_domain: {
          userId,
          domain: dto.domain,
        },
      },
    });

    if (existing && existing.status === 'PENDING') {
      throw new BadRequestException('Application already pending');
    }

    // Create new application
    return await this.prisma.application.create({
      data: {
        userId,
        domain: dto.domain,
        requestedRole: dto.requestedRole,
        formData: dto.formData,
        status: 'PENDING',
      },
    });
  }

  async getPendingApplications(domain?: string) {
    return await this.prisma.application.findMany({
      where: {
        status: 'PENDING',
        ...(domain && { domain }),
      },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewApplication(
    applicationId: number,
    reviewerId: string,
    dto: ReviewApplicationDto,
  ) {
    return await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        reviewedBy: reviewerId,
        reviewNotes: dto.notes,
      },
    });
  }

  async getUserApplications(userId: string) {
    return await this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### Admin Dashboard Queries

```typescript
@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const totalUsers = await this.prisma.user.count();
    const adminCount = await this.prisma.user.count({
      where: { globalRole: 'ADMIN' },
    });
    const activeUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE' },
    });
    const pendingApps = await this.prisma.application.count({
      where: { status: 'PENDING' },
    });

    return {
      totalUsers,
      adminCount,
      activeUsers,
      pendingApplications: pendingApps,
    };
  }

  async getApplicationsByDomain(domain: string) {
    return await this.prisma.application.groupBy({
      by: ['status'],
      where: { domain },
      _count: true,
    });
  }

  async suspendUser(firebaseId: string) {
    return await this.prisma.user.update({
      where: { firebaseId },
      data: { status: 'SUSPENDED' },
    });
  }

  async promoteToAdmin(firebaseId: string) {
    return await this.prisma.user.update({
      where: { firebaseId },
      data: { globalRole: 'ADMIN' },
    });
  }
}
```

---

## Database Migrations

### Migration Files

**Location:** `prisma/migrations/`

**Key Migrations:**

1. **Initial User & Application tables** - Creates User and Application models
2. **Add ApplicationStatus enum** - Defines application status values
3. **Add GlobalRole enum** - Defines global role values

### Running Migrations

```bash
# Apply all pending migrations
npm run prisma:migrate

# Create a new migration
npx prisma migrate dev --name add_new_field

# Reset database (development only)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

---

## Summary

**Auth Service Database Schema (Updated):**

- **7 Models:** User, Application, SubdomainEnrollment, ConsultancyUser, AcademyUser, ContechUser, EventsUser
- **6 Enums:** GlobalRole, ApplicationStatus, ConsultancyRole, AcademyRole, ContechRole, EventsRole
- **Relationships:** 
  - User (1) ↔ (Many) Application
  - User (1) ↔ (1) ConsultancyUser
  - User (1) ↔ (1) AcademyUser
  - User (1) ↔ (1) ContechUser
  - User (1) ↔ (1) EventsUser
  - User (1) ↔ (Many) SubdomainEnrollment
- **Unique Constraints:** firebaseId, email, userId+domain (Application), userId+subdomain (SubdomainEnrollment), userId (per subdomain model)
- **Foreign Keys:** All subdomain models reference User.firebaseId

**Key Features:**
- ✅ Firebase integration (firebaseId as unique identifier)
- ✅ Argon2 password hashing support
- ✅ Global role management (ADMIN/USER)
- ✅ Application workflow (PENDING/APPROVED/REJECTED)
- ✅ User profile information (picture, bio)
- ✅ Account status tracking (ACTIVE/INACTIVE/SUSPENDED)
- ✅ Subdomain-specific role applications
- ✅ **NEW:** Subdomain-specific user models (ConsultancyUser, AcademyUser, ContechUser, EventsUser)
- ✅ **NEW:** Subdomain enrollment tracking (SubdomainEnrollment)
- ✅ **NEW:** Domain-specific metadata storage (university, company, specialization, etc.)
- ✅ **NEW:** Multi-subdomain user support (user can have roles in multiple subdomains)
- ✅ **NEW:** Subdomain-specific role enums (ConsultancyRole, AcademyRole, ContechRole, EventsRole)

**Alignment with USER_PERSONAS_AND_RBAC Framework:**

This updated schema now fully aligns with the RBAC framework by providing:

1. **Global Authentication Layer** - User model with Firebase integration
2. **Subdomain-Specific Roles** - Each subdomain has its own role enum and user model
3. **Multi-Subdomain Support** - SubdomainEnrollment tracks user enrollment across subdomains
4. **Domain-Specific Metadata** - Each subdomain model stores relevant user information
5. **Role Assignment Workflow** - Application approval creates subdomain role records
6. **Admin Escalation** - Platform admins can be assigned admin roles in all subdomains

**Migration Status:**
- Migration file: `20250217_add_subdomain_roles/migration.sql`
- Run with: `npx prisma migrate deploy`

This schema now supports the complete authentication and role-based access control system for AlikoHub with full subdomain support.
