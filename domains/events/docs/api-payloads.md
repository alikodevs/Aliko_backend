# AlikoHub Events API - Request & Response Payloads Reference

This document provides a comprehensive reference of all endpoints, request headers, request payloads, response status codes, and response bodies from the Postman Collection (`AlikoHub-Events-API.postman_collection.json`).

---

## Table of Contents
1. [00. Auth & Token Switch](#00-auth-token-switch)
2. [01. Public (No Auth)](#01-public-no-auth-)
3. [02. Any Authenticated User](#02-any-authenticated-user)
4. [03. Content Manager — Professional Event Lifecycle / A. Create & Edit](#03-content-manager-professional-event-lifecycle-a-create-edit)
5. [03. Content Manager — Professional Event Lifecycle / B. Tickets / Sessions / Sponsors](#03-content-manager-professional-event-lifecycle-b-tickets-sessions-sponsors)
6. [03. Content Manager — Professional Event Lifecycle / C. Day-of Ops (after publish + registrations)](#03-content-manager-professional-event-lifecycle-c-day-of-ops-after-publish-registrations-)
7. [04. Content Manager — Social Event Flow](#04-content-manager-social-event-flow)
8. [05. Admin — Moderation & Users / A. Content Review](#05-admin-moderation-users-a-content-review)
9. [05. Admin — Moderation & Users / B. Users](#05-admin-moderation-users-b-users)
10. [05. Admin — Moderation & Users / C. Promotions](#05-admin-moderation-users-c-promotions)
11. [05. Admin — Moderation & Users / D. Portfolio](#05-admin-moderation-users-d-portfolio)
12. [06. Attendee — Registration Flow](#06-attendee-registration-flow)
13. [07. Utilities](#07-utilities)
14. [08. End-to-End Runner (ordered)](#08-end-to-end-runner-ordered-)

---

## 00. Auth & Token Switch

### [POST] Login (Auth Service)

Exchange email/password for a Firebase ID token. Copy `idToken` into `token` / role token vars.

**Endpoint:** `POST {{base_url}}/auth/login`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "email": "{{login_email}}",
  "password": "{{login_password}}"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] Use Admin Token

Verifies admin token and copies it into `token` for subsequent requests.

**Endpoint:** `GET {{base_url}}/manage/events/profile`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] Use Content Manager Token

Copies `cm_token` → `token`.

**Endpoint:** `GET {{base_url}}/manage/events/profile`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] Use User Token

Copies `user_token` → `token`.

**Endpoint:** `GET {{base_url}}/manage/events/profile`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

## 01. Public (No Auth)

### [GET] 1. List published feed

Only `PUBLISHED` posts. Filter with `type=EVENT|SOCIAL_EVENT|ANNOUNCEMENT|NEWS`.

**Endpoint:** `GET {{base_url}}/events`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "EVENT | SOCIAL_EVENT | ANNOUNCEMENT | NEWS",
      "status": "DRAFT | PENDING | PUBLISHED",
      "title": "string",
      "excerpt": "string",
      "content": "string",
      "coverImage": "string (url)",
      "authorId": "string (firebaseId)",
      "eventDate": "2026-05-02T09:00:00.000Z",
      "location": "string",
      "createdAt": "2026-04-02T09:12:40.015Z",
      "updatedAt": "2026-04-02T09:12:40.015Z"
    }
  ],
  "total": 53,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### [GET] 2. Get published post by ID

UUID required. Returns 403 if not PUBLISHED.

**Endpoint:** `GET {{base_url}}/events/{{event_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] 3. Submit promotion request

Public lead form. Saves `promo_id`.

**Endpoint:** `POST {{base_url}}/events/promote`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "companyName": "Acme Corp",
  "contactPerson": "Jane Doe",
  "email": "jane@acme.example",
  "phoneNumber": "+10000000000",
  "organization": "Acme",
  "event_type": "Conference",
  "estimatedAttendees": "200",
  "preferredDate": "2026-09-01T10:00:00.000Z",
  "location": "Addis Ababa",
  "type": "EVENT",
  "message": "We want to host a professional conference with Aliko Events."
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 4. RSVP to social event

Public. Only works for `SOCIAL_EVENT`. Use `social_event_id` from CM social flow.

**Endpoint:** `POST {{base_url}}/manage/events/rsvps`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{social_event_id}}",
  "guestName": "Guest User",
  "guestEmail": "guest@example.com",
  "response": "yes",
  "mealPreference": "vegetarian",
  "notes": "Looking forward to it"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## 02. Any Authenticated User

### [GET] Get events profile

EventsProfile: id + role (USER | CONTENT_MANAGER | ADMIN).

**Endpoint:** `GET {{base_url}}/manage/events/profile`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] Get events profile (alias /events/profile)

Same as manage profile; under /events prefix.

**Endpoint:** `GET {{base_url}}/events/profile`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] Get my role

Returns `{ userId, role }`.

**Endpoint:** `GET {{base_url}}/events/user-role`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] Self-assign role → ORGANIZER

Self-service. `ORGANIZER` → CONTENT_MANAGER. Cannot self-assign ADMIN. Existing ADMIN is unchanged.

**Endpoint:** `POST {{base_url}}/events/assign-role`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "requestedRole": "ORGANIZER"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] Self-assign role → USER

**Endpoint:** `POST {{base_url}}/events/assign-role`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "requestedRole": "USER"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] Landing info

Featured events, announcements, portfolio, counts.

**Endpoint:** `GET {{base_url}}/manage/events/landing`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] My tickets (as attendee)

Registrations where I am the attendee.

**Endpoint:** `GET {{base_url}}/manage/events/my-tickets`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] My promotion requests

**Endpoint:** `GET {{base_url}}/manage/events/my-promotions`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

## 03. Content Manager — Professional Event Lifecycle / A. Create & Edit

### [POST] 1. Create EVENT draft

Creates DRAFT. Supports multipart (coverImage) or JSON.

**Endpoint:** `POST {{base_url}}/manage/events`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "type": "EVENT",
  "title": "Aliko Tech Summit {{$timestamp}}",
  "excerpt": "Flagship professional event",
  "content": "<p>Full agenda and speakers coming soon.</p>",
  "eventDate": "2026-09-15T09:00:00.000Z",
  "endEventDate": "2026-09-15T18:00:00.000Z",
  "startTime": "09:00",
  "endTime": "18:00",
  "timezone": "Africa/Addis_Ababa",
  "location": "Skylight Hotel",
  "locationAddress": "Addis Ababa"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 1b. Create EVENT draft (multipart + cover)

**Endpoint:** `POST {{base_url}}/manage/events`

#### Request Body (multipart/form-data)
| Field | Type | Value / Description |
| :--- | :--- | :--- |
| `type` | `text` | EVENT |
| `title` | `text` | Summit with Cover |
| `excerpt` | `text` | With image |
| `content` | `text` | <p>Content</p> |
| `eventDate` | `text` | 2026-10-01T09:00:00.000Z |
| `location` | `text` | Hall A |
| `coverImage` | `file` | Select an image file |

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 2. List my drafts

**Endpoint:** `GET {{base_url}}/manage/events`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "EVENT | SOCIAL_EVENT | ANNOUNCEMENT | NEWS",
      "status": "DRAFT | PENDING | PUBLISHED",
      "title": "string",
      "excerpt": "string",
      "content": "string",
      "coverImage": "string (url)",
      "authorId": "string (firebaseId)",
      "eventDate": "2026-05-02T09:00:00.000Z",
      "location": "string",
      "createdAt": "2026-04-02T09:12:40.015Z",
      "updatedAt": "2026-04-02T09:12:40.015Z"
    }
  ],
  "total": 53,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### [GET] 3. Get event (manage)

**Endpoint:** `GET {{base_url}}/manage/events/{{event_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [PATCH] 4. Update draft

CM can edit only while DRAFT or REJECTED (not after APPROVED/PUBLISHED).

**Endpoint:** `PATCH {{base_url}}/manage/events/{{event_id}}`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "title": "Aliko Tech Summit (Updated)",
  "excerpt": "Updated excerpt",
  "location": "Skylight Hotel — Main Hall"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 5. Submit for review

DRAFT|REJECTED → PENDING. Admin must review next.

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/submit`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## 03. Content Manager — Professional Event Lifecycle / B. Tickets / Sessions / Sponsors

### [POST] 1. Create paid ticket tier

**Endpoint:** `POST {{base_url}}/manage/events/tickets`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "name": "VIP",
  "price": 49.99,
  "quantity": 100
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 2. Create free ticket tier

**Endpoint:** `POST {{base_url}}/manage/events/tickets`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "name": "General Admission",
  "price": 0,
  "quantity": 500
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 3. List tickets for event

**Endpoint:** `GET {{base_url}}/manage/events/{{event_id}}/tickets`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [PATCH] 4. Update ticket

**Endpoint:** `PATCH {{base_url}}/manage/events/tickets/{{ticket_id}}`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "name": "VIP Early Bird",
  "price": 39.99,
  "quantity": 80
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 5. List all my ticket tiers

**Endpoint:** `GET {{base_url}}/manage/events/tickets`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] 6. Add session

**Endpoint:** `POST {{base_url}}/manage/events/sessions`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "title": "Opening Keynote",
  "speakerName": "Ada Lovelace",
  "startTime": "2026-09-15T09:30:00.000Z",
  "endTime": "2026-09-15T10:30:00.000Z"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 7. Add sponsor

**Endpoint:** `POST {{base_url}}/manage/events/sponsors`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "name": "Acme Sponsors",
  "tier": "Gold",
  "logoUrl": "https://example.com/logo.png"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [DELETE] 8. Delete session

**Endpoint:** `DELETE {{base_url}}/manage/events/sessions/{{session_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

### [DELETE] 9. Delete sponsor

**Endpoint:** `DELETE {{base_url}}/manage/events/sponsors/{{sponsor_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

### [DELETE] 10. Soft-delete ticket

Hard delete if unused; soft-deactivates if registrations exist.

**Endpoint:** `DELETE {{base_url}}/manage/events/tickets/{{ticket_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

## 03. Content Manager — Professional Event Lifecycle / C. Day-of Ops (after publish + registrations)

### [GET] 1. List registrations (my events)

**Endpoint:** `GET {{base_url}}/manage/events/registrations`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] 2. Event attendees

**Endpoint:** `GET {{base_url}}/manage/events/{{event_id}}/attendees`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] 3. Event stats

**Endpoint:** `GET {{base_url}}/manage/events/{{event_id}}/stats`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] 4. Check-in (POST)

Sets isCheckedIn=true.

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/checkin/{{registration_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [PATCH] 5. Check-in (PATCH idempotent)

Idempotent — will not undo a prior check-in.

**Endpoint:** `PATCH {{base_url}}/manage/events/registrations/{{registration_id}}/checkin`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 6. Send broadcast message

Author or Admin. targetAudience: ALL | CHECKED_IN | NOT_CHECKED_IN (EVENT).

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/message`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "subject": "Welcome to the summit",
  "body": "Doors open at 8:30. Bring your QR code.",
  "targetAudience": "ALL"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 7. Messaging stats

Real dispatch stats (last 30 days). openRate is null without email webhooks.

**Endpoint:** `GET {{base_url}}/manage/events/messaging/stats`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] 8. Dashboard stats

**Endpoint:** `GET {{base_url}}/manage/events/stats`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

## 04. Content Manager — Social Event Flow

### [POST] 1. Create SOCIAL_EVENT

**Endpoint:** `POST {{base_url}}/manage/events`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "type": "SOCIAL_EVENT",
  "title": "Community Meetup {{$timestamp}}",
  "excerpt": "Casual evening",
  "content": "<p>Bring a friend.</p>",
  "eventDate": "2026-08-20T17:00:00.000Z",
  "location": "Rooftop Lounge",
  "hostName": "Aliko Community",
  "privacy": "public"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 2. Confirm public detail

**Endpoint:** `GET {{base_url}}/events/{{social_event_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [GET] 3. List RSVPs (my social events)

**Endpoint:** `GET {{base_url}}/manage/events/rsvps`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [DELETE] 4. Delete RSVP

**Endpoint:** `DELETE {{base_url}}/manage/events/rsvps/{{rsvp_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

### [POST] 5. Message RSVPs

**Endpoint:** `POST {{base_url}}/manage/events/{{social_event_id}}/message`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "subject": "See you tonight",
  "body": "Starts at 5pm.",
  "targetAudience": "RSVP_YES"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## 05. Admin — Moderation & Users / A. Content Review

### [GET] 1. List PENDING posts

**Endpoint:** `GET {{base_url}}/manage/events`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "EVENT | SOCIAL_EVENT | ANNOUNCEMENT | NEWS",
      "status": "DRAFT | PENDING | PUBLISHED",
      "title": "string",
      "excerpt": "string",
      "content": "string",
      "coverImage": "string (url)",
      "authorId": "string (firebaseId)",
      "eventDate": "2026-05-02T09:00:00.000Z",
      "location": "string",
      "createdAt": "2026-04-02T09:12:40.015Z",
      "updatedAt": "2026-04-02T09:12:40.015Z"
    }
  ],
  "total": 53,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### [POST] 2. Review → APPROVED (publishes)

APPROVED is mapped to PUBLISHED server-side so the event goes live.

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/review`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "status": "APPROVED"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 3. Review → PUBLISHED

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/review`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "status": "PUBLISHED"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 4. Review → REJECTED

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/review`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "status": "REJECTED",
  "rejectionReason": "Please add a clearer agenda and cover image."
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [DELETE] 5. Delete post

Author or Admin.

**Endpoint:** `DELETE {{base_url}}/manage/events/{{event_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

## 05. Admin — Moderation & Users / B. Users

### [GET] 1. List all events profiles

**Endpoint:** `GET {{base_url}}/manage/events/users`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [PATCH] 2. Set user → CONTENT_MANAGER

**Endpoint:** `PATCH {{base_url}}/manage/events/users/{{target_user_id}}/role`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "role": "CONTENT_MANAGER"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [PATCH] 3. Set user → USER

**Endpoint:** `PATCH {{base_url}}/manage/events/users/{{target_user_id}}/role`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "role": "USER"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [PATCH] 4. Set user → ADMIN

**Endpoint:** `PATCH {{base_url}}/manage/events/users/{{target_user_id}}/role`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "role": "ADMIN"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [DELETE] 5. Delete user profile

Removes EventsProfile only (destructive).

**Endpoint:** `DELETE {{base_url}}/manage/events/users/{{target_user_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

## 05. Admin — Moderation & Users / C. Promotions

### [GET] 1. List all promotion requests

**Endpoint:** `GET {{base_url}}/manage/events/promotions`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [PATCH] 2. Mark promotion reviewed

**Endpoint:** `PATCH {{base_url}}/manage/events/promotions/{{promo_id}}/review`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 3. Convert promotion → event draft

Creates a draft EVENT from the promotion request.

**Endpoint:** `POST {{base_url}}/manage/events/promotions/{{promo_id}}/convert`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## 05. Admin — Moderation & Users / D. Portfolio

### [GET] 1. List portfolio

**Endpoint:** `GET {{base_url}}/manage/events/portfolio`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] 2. Add portfolio media

**Endpoint:** `POST {{base_url}}/manage/events/portfolio`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "portal": "professional",
  "category": "past-events",
  "title": "Summit 2025 Recap",
  "description": "Highlights",
  "mediaType": "image",
  "mediaUrl": "https://example.com/recap.jpg",
  "thumbnailUrl": "https://example.com/recap-thumb.jpg",
  "sortOrder": 1
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [DELETE] 3. Delete portfolio media

**Endpoint:** `DELETE {{base_url}}/manage/events/portfolio/{{portfolio_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "message": "Resource successfully deleted"
}
```

---

## 06. Attendee — Registration Flow

### [POST] 1. Register with paid ticket

**Endpoint:** `POST {{base_url}}/manage/events/registrations`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "ticketId": "{{ticket_id}}",
  "attendeeName": "Attendee One",
  "attendeeEmail": "attendee1@example.com"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] 2. Register with free ticket

**Endpoint:** `POST {{base_url}}/manage/events/registrations`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "ticketId": "{{free_ticket_id}}",
  "attendeeName": "Attendee Free",
  "attendeeEmail": "attendee.free@example.com"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] 3. My tickets

**Endpoint:** `GET {{base_url}}/manage/events/my-tickets`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

## 07. Utilities

### [POST] Upload file

**Endpoint:** `POST {{base_url}}/manage/events/upload`

#### Request Body (multipart/form-data)
| Field | Type | Value / Description |
| :--- | :--- | :--- |
| `file` | `file` | File to upload |
| `type` | `text` | image | video | document |

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## 08. End-to-End Runner (ordered)

### [POST] E2E 01 — Create EVENT draft

**Endpoint:** `POST {{base_url}}/manage/events`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "type": "EVENT",
  "title": "E2E Event {{$timestamp}}",
  "excerpt": "Postman E2E",
  "content": "<p>E2E content</p>",
  "eventDate": "2026-11-01T09:00:00.000Z",
  "location": "E2E Hall"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 02 — Create VIP ticket

**Endpoint:** `POST {{base_url}}/manage/events/tickets`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "name": "VIP",
  "price": 25,
  "quantity": 50
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 03 — Create free ticket

**Endpoint:** `POST {{base_url}}/manage/events/tickets`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "name": "Free",
  "price": 0,
  "quantity": 100
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 04 — Add session

**Endpoint:** `POST {{base_url}}/manage/events/sessions`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "title": "E2E Session",
  "speakerName": "Speaker",
  "startTime": "2026-11-01T10:00:00.000Z",
  "endTime": "2026-11-01T11:00:00.000Z"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 05 — Submit for review

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/submit`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 06 — Admin approve (publishes)

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/review`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "status": "APPROVED"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [GET] E2E 07 — Public can see it

**Endpoint:** `GET {{base_url}}/events/{{event_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
---

### [POST] E2E 08 — Register free ticket

**Endpoint:** `POST {{base_url}}/manage/events/registrations`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{event_id}}",
  "ticketId": "{{free_ticket_id}}",
  "attendeeName": "E2E Attendee",
  "attendeeEmail": "e2e@example.com"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 09 — Check-in

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/checkin/{{registration_id}}`

*No request body required (Query parameters or URL path only).*

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 10 — Broadcast message

**Endpoint:** `POST {{base_url}}/manage/events/{{event_id}}/message`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "subject": "E2E hello",
  "body": "Thanks for registering",
  "targetAudience": "ALL"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 11 — Create social + RSVP

**Endpoint:** `POST {{base_url}}/manage/events`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "type": "SOCIAL_EVENT",
  "title": "E2E Social {{$timestamp}}",
  "content": "<p>Party</p>",
  "location": "Garden"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

### [POST] E2E 12 — Public RSVP

**Endpoint:** `POST {{base_url}}/manage/events/rsvps`

#### Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | - |

#### Request Body (JSON)
```json
{
  "eventId": "{{social_event_id}}",
  "guestName": "E2E Guest",
  "guestEmail": "e2e.guest@example.com",
  "response": "yes"
}
```

#### Response Structure
```json
{
  "id": "uuid",
  "title": "string",
  "status": "string",
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

