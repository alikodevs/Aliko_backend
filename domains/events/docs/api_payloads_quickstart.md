# AlikoHub Events API - Quickstart Payloads & cURL Examples

A fast reference with working cURL examples and JSON payloads for local and remote testing.

---

## 1. Quick Authentication
\`\`\`bash
# Login as Admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3006/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin.system@alikohub.com","password":"SecurePassword123!"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Login as Standard User
USER_TOKEN=$(curl -s -X POST http://localhost:3006/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user.test@alikohub.com","password":"SecurePassword123!"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
\`\`\`

---

## 2. Professional Event Lifecycle

### Step 1: Create Event Draft
\`\`\`bash
curl -X POST http://localhost:3006/manage/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EVENT",
    "title": "Africa Cloud & AI Summit 2026",
    "excerpt": "Enterprise cloud architecture and LLM deployment at scale.",
    "content": "<p>Join leading CTOs and cloud architects across Africa for keynote sessions and hands-on masterclasses.</p>",
    "eventDate": "2026-11-20T09:00:00.000Z",
    "startTime": "09:00",
    "endTime": "17:30",
    "timezone": "EAT",
    "location": "Kigali Convention Centre, Rwanda",
    "status": "DRAFT"
  }'
\`\`\`

### Step 2: Add VIP Ticket Tier
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/tickets \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<EVENT_ID>",
    "name": "VIP All-Access Pass",
    "description": "Includes VIP lounge networking, private speaker dinner, and workshop access.",
    "price": 149.99,
    "currency": "USD",
    "capacity": 100
  }'
\`\`\`

### Step 3: Add Schedule Session
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<EVENT_ID>",
    "title": "Scaling Distributed ML Clusters on Multi-Cloud",
    "speakerName": "Dr. Kwame Mensah",
    "speakerTitle": "Head of AI Infrastructure",
    "startTime": "2026-11-20T11:00:00.000Z",
    "endTime": "2026-11-20T12:15:00.000Z",
    "location": "Main Stage"
  }'
\`\`\`

### Step 4: Submit Draft for Review
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/<EVENT_ID>/submit \
  -H "Authorization: Bearer $ADMIN_TOKEN"
\`\`\`

### Step 5: Admin Review & Publish
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/<EVENT_ID>/review \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "PUBLISHED"
  }'
\`\`\`

---

## 3. Attendee Registration & Day-of Operations

### Step 1: Attendee Registers with Ticket
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/registrations \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<EVENT_ID>",
    "ticketId": "<TICKET_ID>",
    "attendeeName": "Amina Hassan",
    "attendeeEmail": "amina.hassan@example.com",
    "totalPaid": 0
  }'
\`\`\`

### Step 2: Check-in Attendee at Venue Entrance
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/<EVENT_ID>/checkin/<REGISTRATION_ID> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
\`\`\`

### Step 3: Broadcast Push Message to Attendees
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/<EVENT_ID>/message \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Lunch & Afternoon Workshops",
    "message": "Networking lunch is now being served in the Garden Terrace. Afternoon tracks commence at 14:00."
  }'
\`\`\`

---

## 4. Social Events & Guest RSVPs

### Create Instant Social Event
\`\`\`bash
curl -X POST http://localhost:3006/manage/events \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SOCIAL_EVENT",
    "title": "AlikoHub Alumni Summer Mixer",
    "excerpt": "Catch up with alumni founders, engineers, and creators.",
    "content": "<p>Join us for craft mocktails, live acoustic music, and meaningful conversations.</p>",
    "eventDate": "2026-09-12T17:00:00.000Z",
    "startTime": "17:00",
    "endTime": "21:30",
    "location": "The Rooftop Lounge, Westlands",
    "hostName": "AlikoHub Community Team",
    "privacy": "public",
    "templateId": "sunset",
    "status": "PUBLISHED"
  }'
\`\`\`

### Guest Submits Public RSVP
\`\`\`bash
curl -X POST http://localhost:3006/manage/events/rsvps \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<SOCIAL_EVENT_ID>",
    "guestName": "Tariq Mansoor",
    "guestEmail": "tariq.mansoor@example.com",
    "status": "ATTENDING",
    "plusOnes": 1,
    "dietaryPreferences": "None",
    "notes": "Excited to reconnect!"
  }'
\`\`\`
