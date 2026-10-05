# Postman Collection - Auth Service with Subdomain RBAC

## Authentication Endpoints

### Register User
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "password": "password123",
  "role": "USER"
}
```

### Register Admin
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "firstname": "Admin",
  "lastname": "User",
  "password": "password123",
  "role": "ADMIN"
}
```

### Register Academy Admin
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "academy.admin@example.com",
  "firstname": "Academy",
  "lastname": "Admin",
  "password": "password123",
  "role": "ACADEMY_ADMIN"
}
```

### Register Academy Instructor
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "academy.instructor@example.com",
  "firstname": "Academy",
  "lastname": "Instructor",
  "password": "password123",
  "role": "ACADEMY_INSTRUCTOR"
}
```

### Register Academy Student
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "academy.student@example.com",
  "firstname": "Academy",
  "lastname": "Student",
  "password": "password123",
  "role": "ACADEMY_STUDENT"
}
```

### Register Consultancy Advisor
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "consultancy.advisor@example.com",
  "firstname": "Consultancy",
  "lastname": "Advisor",
  "password": "password123",
  "role": "CONSULTANCY_ADVISOR"
}
```

### Register Consultancy Manager
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "consultancy.manager@example.com",
  "firstname": "Consultancy",
  "lastname": "Manager",
  "password": "password123",
  "role": "CONSULTANCY_MANAGER"
}
```

### Register Consultancy Client
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "consultancy.client@example.com",
  "firstname": "Consultancy",
  "lastname": "Client",
  "password": "password123",
  "role": "CONSULTANCY_CLIENT"
}
```

### Register Contech Developer
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "contech.developer@example.com",
  "firstname": "Contech",
  "lastname": "Developer",
  "password": "password123",
  "role": "CONTECH_DEVELOPER"
}
```

### Register Contech Designer
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "contech.designer@example.com",
  "firstname": "Contech",
  "lastname": "Designer",
  "password": "password123",
  "role": "CONTECH_DESIGNER"
}
```

### Register Contech Project Manager
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "contech.pm@example.com",
  "firstname": "Contech",
  "lastname": "ProjectManager",
  "password": "password123",
  "role": "CONTECH_PROJECT_MANAGER"
}
```

### Register Events Organizer
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "events.organizer@example.com",
  "firstname": "Events",
  "lastname": "Organizer",
  "password": "password123",
  "role": "EVENTS_ORGANIZER"
}
```

### Register Events Participant
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "events.participant@example.com",
  "firstname": "Events",
  "lastname": "Participant",
  "password": "password123",
  "role": "EVENTS_PARTICIPANT"
}
```

### Register Events Sponsor
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "events.sponsor@example.com",
  "firstname": "Events",
  "lastname": "Sponsor",
  "password": "password123",
  "role": "EVENTS_SPONSOR"
}
```

### Login
```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Google Login
```http
POST http://localhost:3000/auth/login/google
Content-Type: application/json

{
  "idToken": "google_id_token_here"
}
```

## RBAC Protected Endpoints

### Admin Resource (Requires ADMIN role)
```http
GET http://localhost:3000/rbac/admin
Authorization: Bearer {{firebase_token}}
```

### User Resource (Requires USER role)
```http
GET http://localhost:3000/rbac/user
Authorization: Bearer {{firebase_token}}
```

### Academy Admin Resource (Requires ACADEMY_ADMIN role)
```http
GET http://localhost:3000/rbac/academy-admin
Authorization: Bearer {{firebase_token}}
```

### Academy Instructor Resource (Requires ACADEMY_INSTRUCTOR role)
```http
GET http://localhost:3000/rbac/academy-instructor
Authorization: Bearer {{firebase_token}}
```

### Academy Student Resource (Requires ACADEMY_STUDENT role)
```http
GET http://localhost:3000/rbac/academy-student
Authorization: Bearer {{firebase_token}}
```

### Consultancy Advisor Resource (Requires CONSULTANCY_ADVISOR role)
```http
GET http://localhost:3000/rbac/consultancy-advisor
Authorization: Bearer {{firebase_token}}
```

### Consultancy Manager Resource (Requires CONSULTANCY_MANAGER role)
```http
GET http://localhost:3000/rbac/consultancy-manager
Authorization: Bearer {{firebase_token}}
```

### Consultancy Client Resource (Requires CONSULTANCY_CLIENT role)
```http
GET http://localhost:3000/rbac/consultancy-client
Authorization: Bearer {{firebase_token}}
```

### Contech Developer Resource (Requires CONTECH_DEVELOPER role)
```http
GET http://localhost:3000/rbac/contech-developer
Authorization: Bearer {{firebase_token}}
```

### Contech Designer Resource (Requires CONTECH_DESIGNER role)
```http
GET http://localhost:3000/rbac/contech-designer
Authorization: Bearer {{firebase_token}}
```

### Contech Project Manager Resource (Requires CONTECH_PROJECT_MANAGER role)
```http
GET http://localhost:3000/rbac/contech-project-manager
Authorization: Bearer {{firebase_token}}
```

### Events Organizer Resource (Requires EVENTS_ORGANIZER role)
```http
GET http://localhost:3000/rbac/events-organizer
Authorization: Bearer {{firebase_token}}
```

### Events Participant Resource (Requires EVENTS_PARTICIPANT role)
```http
GET http://localhost:3000/rbac/events-participant
Authorization: Bearer {{firebase_token}}
```

### Events Sponsor Resource (Requires EVENTS_SPONSOR role)
```http
GET http://localhost:3000/rbac/events-sponsor
Authorization: Bearer {{firebase_token}}
```

## User Management

### Get User by Email
```http
GET http://localhost:3000/user/user@example.com
Authorization: Bearer {{firebase_token}}
```

## Postman Setup Instructions

1. **Create Environment Variables:**
   - `firebase_token` - Set this to the token received from login response

2. **Import Steps:**
   - Copy each endpoint above into Postman
   - Set the Authorization header to use the `{{firebase_token}}` variable
   - Update email addresses for testing different roles

3. **Testing Flow:**
   - Register users with different roles
   - Login to get Firebase token
   - Set the token in environment variable
   - Test RBAC endpoints with appropriate roles

## Available Roles

- **Global Roles:** USER, ADMIN
- **Academy Roles:** ACADEMY_ADMIN, ACADEMY_INSTRUCTOR, ACADEMY_STUDENT
- **Consultancy Roles:** CONSULTANCY_ADVISOR, CONSULTANCY_MANAGER, CONSULTANCY_CLIENT
- **Contech Roles:** CONTECH_DEVELOPER, CONTECH_DESIGNER, CONTECH_PROJECT_MANAGER
- **Events Roles:** EVENTS_ORGANIZER, EVENTS_PARTICIPANT, EVENTS_SPONSOR
