# AlikoHub Events API - Request & Response Payload Reference

This document provides complete request and response specifications for all endpoints in the **AlikoHub Events API**, organized by functional domain and user role.

---

## 1. Authentication & Role Switch

### 1.1 Login (Auth Service)
- **Method:** \`POST\`
- **Endpoint:** \`/auth/login\`
- **Headers:**
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "email": "admin.system@alikohub.com",
  "password": "SecurePassword123!"
}
\`\`\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_uuid",
    "firebaseId": "K3SKLgYJsHY8SFOSL3MyT1jV6FP2",
    "email": "admin.system@alikohub.com",
    "firstname": "Admin",
    "lastname": "System",
    "globalRole": "ADMIN",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
\`\`\`

---

### 1.2 Get My Events Profile
- **Method:** \`GET\`
- **Endpoint:** \`/manage/events/profile\`
- **Headers:**
  - \`Authorization: Bearer <token>\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "id": "K3SKLgYJsHY8SFOSL3MyT1jV6FP2",
  "role": "ADMIN",
  "bio": null,
  "organization": null,
  "socialLinks": null,
  "createdAt": "2026-04-02T09:12:40.015Z",
  "updatedAt": "2026-04-02T09:12:40.015Z"
}
\`\`\`

---

### 1.3 Self-Assign Role (Switch to Organizer / User)
- **Method:** \`PATCH\`
- **Endpoint:** \`/events/role\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "role": "CONTENT_MANAGER"
}
\`\`\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "id": "user_firebase_id",
  "role": "CONTENT_MANAGER",
  "updatedAt": "2026-08-21T09:00:00.000Z"
}
\`\`\`

---

## 2. Public Endpoints (No Auth Required)

### 2.1 List Published Events & Posts
- **Method:** \`GET\`
- **Endpoint:** \`/events?type=EVENT&limit=20&page=1\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "items": [
    {
      "id": "f26cd460-0a4d-4a7c-9501-4891ab666f7f",
      "type": "EVENT",
      "status": "PUBLISHED",
      "title": "Africa FinTech Disrupt 2026",
      "excerpt": "The premier fintech event connecting startups and investors.",
      "content": "<p>Join us in Kigali to witness the next generation of financial technology...</p>",
      "coverImage": "http://localhost:3006/uploads/alikohub/images/sample.jpg",
      "authorId": "K3SKLgYJsHY8SFOSL3MyT1jV6FP2",
      "publishDate": "2026-04-02T09:12:39.917Z",
      "slug": "africa-fintech-disrupt-2026",
      "eventDate": "2026-05-02T09:12:39.917Z",
      "endEventDate": "2026-05-04T09:12:39.917Z",
      "startTime": "08:00",
      "endTime": "18:00",
      "timezone": "EAT",
      "location": "Kigali Convention Centre",
      "locationAddress": "KG 2 Roundabout, Kigali, Rwanda",
      "locationMapUrl": null,
      "externalLink": "https://alikohub.com/fintech",
      "createdAt": "2026-04-02T09:12:40.015Z",
      "updatedAt": "2026-04-02T09:12:40.015Z"
    }
  ],
  "total": 53,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
\`\`\`

---

### 2.2 Get Single Published Post by ID
- **Method:** \`GET\`
- **Endpoint:** \`/events/:id\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "id": "f26cd460-0a4d-4a7c-9501-4891ab666f7f",
  "type": "EVENT",
  "status": "PUBLISHED",
  "title": "Africa FinTech Disrupt 2026",
  "excerpt": "The premier fintech event connecting startups and investors.",
  "content": "<p>Full rich-text description of event agenda and speakers...</p>",
  "coverImage": "http://localhost:3006/uploads/alikohub/images/sample.jpg",
  "eventDate": "2026-05-02T09:12:39.917Z",
  "location": "Kigali Convention Centre",
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Opening Keynote: State of African FinTech",
      "speakerName": "Dr. Amina Touré",
      "speakerTitle": "Partner, Pan-African Ventures",
      "startTime": "2026-05-02T09:00:00.000Z",
      "endTime": "2026-05-02T10:30:00.000Z",
      "location": "Auditorium A"
    }
  ],
  "tickets": [
    {
      "id": "ticket-uuid-1",
      "name": "General Admission",
      "price": 0,
      "currency": "USD",
      "capacity": 500,
      "soldCount": 124,
      "isActive": true
    },
    {
      "id": "ticket-uuid-2",
      "name": "VIP Investor Pass",
      "price": 199.99,
      "currency": "USD",
      "capacity": 50,
      "soldCount": 38,
      "isActive": true
    }
  ],
  "sponsors": [
    {
      "id": "sponsor-uuid",
      "name": "TechBank Africa",
      "tier": "PLATINUM",
      "logoUrl": "http://localhost:3006/uploads/alikohub/images/sponsor.png",
      "websiteUrl": "https://techbank.example.com"
    }
  ]
}
\`\`\`

---

### 2.3 Submit Promotion Request (Public Form)
- **Method:** \`POST\`
- **Endpoint:** \`/events/promote\`
- **Headers:**
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "companyName": "Apex Technologies Inc.",
  "contactPerson": "Sarah Johnson",
  "email": "sarah.johnson@apextech.io",
  "phone": "+1-555-0199",
  "website": "https://apextech.io",
  "eventDetails": "Annual AI Developers Global Summit for enterprise engineers.",
  "targetAudience": "Software engineers, CTOs, AI researchers",
  "budget": "$15,000 - $25,000",
  "preferredDates": "November 14-16, 2026",
  "notes": "Looking for co-marketing partnership and ticket sales integration."
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "promo_req_uuid",
  "companyName": "Apex Technologies Inc.",
  "contactPerson": "Sarah Johnson",
  "email": "sarah.johnson@apextech.io",
  "status": "PENDING",
  "createdAt": "2026-08-21T09:00:00.000Z"
}
\`\`\`

---

## 3. Content Manager — Professional Events Management

### 3.1 Create Draft Professional Event
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "type": "EVENT",
  "title": "East Africa Renewable Energy Conference 2026",
  "excerpt": "Accelerating the clean energy transition across sub-Saharan Africa.",
  "content": "<p>Join policy makers, energy developers, and venture funders for 3 days of high-level roundtables...</p>",
  "eventDate": "2026-11-10T09:00:00.000Z",
  "endEventDate": "2026-11-12T17:00:00.000Z",
  "startTime": "09:00",
  "endTime": "17:00",
  "timezone": "EAT",
  "location": "Nairobi Serena Hotel",
  "locationAddress": "Processional Way, Nairobi, Kenya",
  "externalLink": "https://energyconference.example.org",
  "status": "DRAFT"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "event_uuid_123",
  "type": "EVENT",
  "status": "DRAFT",
  "title": "East Africa Renewable Energy Conference 2026",
  "authorId": "K3SKLgYJsHY8SFOSL3MyT1jV6FP2",
  "createdAt": "2026-08-21T09:00:00.000Z",
  "updatedAt": "2026-08-21T09:00:00.000Z"
}
\`\`\`

---

### 3.2 Update Draft Event
- **Method:** \`PATCH\`
- **Endpoint:** \`/manage/events/:id\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "title": "East Africa Renewable Energy Summit & Expo 2026",
  "excerpt": "Updated keynote lineup and exhibition floor map.",
  "location": "Kenyatta International Convention Centre (KICC), Nairobi"
}
\`\`\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "id": "event_uuid_123",
  "title": "East Africa Renewable Energy Summit & Expo 2026",
  "location": "Kenyatta International Convention Centre (KICC), Nairobi",
  "updatedAt": "2026-08-21T09:01:00.000Z"
}
\`\`\`

---

### 3.3 Create Ticket Tier
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/tickets\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "eventId": "event_uuid_123",
  "name": "Early Bird Delegate Pass",
  "description": "Access to all conference sessions and networking lunch.",
  "price": 75.00,
  "currency": "USD",
  "capacity": 200,
  "saleStartDate": "2026-09-01T00:00:00.000Z",
  "saleEndDate": "2026-10-15T23:59:59.000Z"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "ticket_tier_uuid",
  "eventId": "event_uuid_123",
  "name": "Early Bird Delegate Pass",
  "price": 75,
  "currency": "USD",
  "capacity": 200,
  "soldCount": 0,
  "isActive": true
}
\`\`\`

---

### 3.4 Add Agenda Session
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/sessions\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "eventId": "event_uuid_123",
  "title": "Grid Modernization & Solar Infrastructure",
  "description": "Panel discussion on off-grid micro-grids and battery storage deployments.",
  "speakerName": "Eng. David Mwangi",
  "speakerTitle": "Chief Technology Officer, SolarPower Kenya",
  "startTime": "2026-11-10T10:00:00.000Z",
  "endTime": "2026-11-10T11:30:00.000Z",
  "location": "Plenary Hall 1"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "session_uuid",
  "eventId": "event_uuid_123",
  "title": "Grid Modernization & Solar Infrastructure",
  "speakerName": "Eng. David Mwangi",
  "startTime": "2026-11-10T10:00:00.000Z",
  "endTime": "2026-11-10T11:30:00.000Z"
}
\`\`\`

---

### 3.5 Add Event Sponsor
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/sponsors\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "eventId": "event_uuid_123",
  "name": "GreenGrid Energy",
  "tier": "PLATINUM",
  "logoUrl": "http://localhost:3006/uploads/alikohub/images/greengrid.png",
  "websiteUrl": "https://greengrid.example.com"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "sponsor_uuid",
  "eventId": "event_uuid_123",
  "name": "GreenGrid Energy",
  "tier": "PLATINUM",
  "logoUrl": "http://localhost:3006/uploads/alikohub/images/greengrid.png"
}
\`\`\`

---

### 3.6 Submit Draft for Admin Review
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/:id/submit\`
- **Headers:**
  - \`Authorization: Bearer <token>\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "event_uuid_123",
  "title": "East Africa Renewable Energy Summit & Expo 2026",
  "status": "PENDING",
  "updatedAt": "2026-08-21T09:02:00.000Z"
}
\`\`\`

---

## 4. Admin Moderation & Operations

### 4.1 Review & Publish Pending Event
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/:id/review\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload (Approve & Publish)
\`\`\`json
{
  "status": "PUBLISHED"
}
\`\`\`

#### Request Payload (Reject with Reason)
\`\`\`json
{
  "status": "REJECTED",
  "rejectionReason": "Please provide high-resolution banner image and complete speaker bios."
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "event_uuid_123",
  "title": "East Africa Renewable Energy Summit & Expo 2026",
  "status": "PUBLISHED",
  "publishDate": "2026-08-21T09:03:00.000Z",
  "updatedAt": "2026-08-21T09:03:00.000Z"
}
\`\`\`

---

### 4.2 Convert Promotion Proposal to Event Draft
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/promotions/:id/convert\`
- **Headers:**
  - \`Authorization: Bearer <token>\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "new_converted_event_uuid",
  "type": "EVENT",
  "status": "DRAFT",
  "title": "Annual AI Developers Global Summit",
  "authorId": "K3SKLgYJsHY8SFOSL3MyT1jV6FP2",
  "content": "<p>Event converted from promotion proposal submitted by Apex Technologies Inc...</p>",
  "createdAt": "2026-08-21T09:03:30.000Z"
}
\`\`\`

---

### 4.3 Change User Role
- **Method:** \`PATCH\`
- **Endpoint:** \`/manage/events/users/:userId/role\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "role": "CONTENT_MANAGER"
}
\`\`\`

#### Response Payload (\`200 OK\`)
\`\`\`json
{
  "id": "target_user_firebase_id",
  "role": "CONTENT_MANAGER",
  "updatedAt": "2026-08-21T09:04:00.000Z"
}
\`\`\`

---

## 5. Attendee Registration & Day-of Check-in

### 5.1 Register for Event (Free or Paid Ticket)
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/registrations\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "eventId": "event_uuid_123",
  "ticketId": "ticket_tier_uuid",
  "attendeeName": "Michael Scott",
  "attendeeEmail": "michael.scott@example.com",
  "totalPaid": 0
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "registration_uuid_456",
  "eventId": "event_uuid_123",
  "ticketId": "ticket_tier_uuid",
  "attendeeName": "Michael Scott",
  "attendeeEmail": "michael.scott@example.com",
  "ticketCode": "TIC-8F29C1B0",
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "isCheckedIn": false,
  "createdAt": "2026-08-21T09:04:15.000Z"
}
\`\`\`

---

### 5.2 Day-of Attendee Check-in
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/:eventId/checkin/:registrationId\`
- **Headers:**
  - \`Authorization: Bearer <token>\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "registration_uuid_456",
  "attendeeName": "Michael Scott",
  "isCheckedIn": true,
  "checkInTime": "2026-08-21T09:04:30.000Z"
}
\`\`\`

---

### 5.3 Broadcast Message to Attendees
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/:id/message\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "subject": "Important update regarding registration desk & parking",
  "message": "Doors open at 8:00 AM tomorrow. Free underground parking is available on levels P2 and P3."
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "broadcast_uuid",
  "eventId": "event_uuid_123",
  "recipientCount": 124,
  "status": "SENT",
  "sentAt": "2026-08-21T09:04:45.000Z"
}
\`\`\`

---

## 6. Social Events & RSVPs

### 6.1 Create Social Event (Instantly Published)
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "type": "SOCIAL_EVENT",
  "title": "Alex & Jordan Wedding Reception",
  "excerpt": "Celebrate our special day with dinner and dancing under the stars.",
  "content": "<p>We invite you to join us at Villa Rosa for an unforgettable celebration...</p>",
  "eventDate": "2026-10-18T18:00:00.000Z",
  "startTime": "18:00",
  "endTime": "23:59",
  "location": "Villa Rosa Kempinski, Nairobi",
  "hostName": "Alex & Jordan",
  "privacy": "link_only",
  "templateId": "elegant",
  "status": "PUBLISHED"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "social_event_uuid_789",
  "type": "SOCIAL_EVENT",
  "status": "PUBLISHED",
  "title": "Alex & Jordan Wedding Reception",
  "hostName": "Alex & Jordan",
  "privacy": "link_only",
  "templateId": "elegant",
  "createdAt": "2026-08-21T09:05:00.000Z"
}
\`\`\`

---

### 6.2 Submit Guest RSVP
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/rsvps\`
- **Headers:**
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "eventId": "social_event_uuid_789",
  "guestName": "David Kiptoo",
  "guestEmail": "david.kiptoo@example.com",
  "status": "ATTENDING",
  "plusOnes": 1,
  "dietaryPreferences": "Vegetarian",
  "notes": "Looking forward to celebrating with you both!"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "rsvp_uuid",
  "eventId": "social_event_uuid_789",
  "guestName": "David Kiptoo",
  "status": "ATTENDING",
  "plusOnes": 1,
  "createdAt": "2026-08-21T09:05:15.000Z"
}
\`\`\`

---

## 7. Media & Portfolio Showcase

### 7.1 Upload Media Asset
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/upload\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: multipart/form-data\`

#### Form Data
- \`file\`: (binary file buffer)
- \`type\`: \`image\` | \`video\` | \`document\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "url": "http://localhost:3006/uploads/alikohub/images/84189e3a-9694-436f-b125-50e50f384a7e.png",
  "publicId": "alikohub/images/84189e3a-9694-436f-b125-50e50f384a7e.png",
  "format": "png",
  "size": 184520
}
\`\`\`

---

### 7.2 Add Portfolio Gallery Item
- **Method:** \`POST\`
- **Endpoint:** \`/manage/events/portfolio\`
- **Headers:**
  - \`Authorization: Bearer <token>\`
  - \`Content-Type: application/json\`

#### Request Payload
\`\`\`json
{
  "title": "East Africa Tech Summit 2025 Keynote",
  "description": "Over 1,200 attendees joined the opening plenary on digital economy.",
  "portal": "professional",
  "category": "Conference",
  "mediaType": "image",
  "mediaUrl": "http://localhost:3006/uploads/alikohub/images/gallery-item.jpg",
  "thumbnailUrl": "http://localhost:3006/uploads/alikohub/images/gallery-item-thumb.jpg"
}
\`\`\`

#### Response Payload (\`201 Created\`)
\`\`\`json
{
  "id": "portfolio_uuid",
  "title": "East Africa Tech Summit 2025 Keynote",
  "portal": "professional",
  "category": "Conference",
  "mediaType": "image",
  "mediaUrl": "http://localhost:3006/uploads/alikohub/images/gallery-item.jpg",
  "createdAt": "2026-08-21T09:05:30.000Z"
}
\`\`\`
