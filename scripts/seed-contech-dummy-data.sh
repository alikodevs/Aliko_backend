#!/bin/bash
set -e

API_GATEWAY="http://localhost:3006"
PASSWORD="SecurePassword123!"

ADMIN_EMAIL="admin2@test.alikohub.com"
CONTRACTOR_EMAIL="contractor2@test.alikohub.com"
CLIENT_EMAIL="client2@test.alikohub.com"

# Contractor Firebase ID
CONTRACTOR_ID="Ps4M8BYa1rTrPFGd87tNft3HFtg2"

echo ">>> Fetching tokens..."
ADMIN_LOGIN=$(curl -s -X POST "$API_GATEWAY/auth/login" -H "Content-Type: application/json" -d "{ \"email\": \"$ADMIN_EMAIL\", \"password\": \"$PASSWORD\" }" | grep -oP '"accessToken":"\K[^"]+')
CONTRACTOR_TOKEN=$(curl -s -X POST "$API_GATEWAY/auth/login" -H "Content-Type: application/json" -d "{ \"email\": \"$CONTRACTOR_EMAIL\", \"password\": \"$PASSWORD\" }" | grep -oP '"accessToken":"\K[^"]+')

echo ">>> Setting Contractor Role..."
curl -s -X POST "$API_GATEWAY/profile/select-role" \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "role": "CONTRACTOR" }' > /dev/null

echo ">>> Creating Project (as Admin)..."
PROJECT_ID=$(curl -s -X POST "$API_GATEWAY/projects" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Smart City Phase 3\",
    \"description\": \"Final phase of the residential development.\",
    \"startDate\": \"2026-08-01\",
    \"endDate\": \"2028-06-01\",
    \"budget\": 12000000,
    \"location\": \"Bole, Addis Ababa\",
    \"contractorId\": \"$CONTRACTOR_ID\"
  }" | grep -oP '"id":\K\d+')

echo "Created Project ID: $PROJECT_ID"

echo ">>> Creating Task (as Admin)..."
curl -s -X POST "$API_GATEWAY/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": $PROJECT_ID,
    \"description\": \"Infrastructure and Plumbing\",
    \"priority\": \"HIGH\",
    \"assignedTo\": \"$CONTRACTOR_ID\",
    \"deadline\": \"2026-09-20\"
  }" > /dev/null

echo ">>> Logging Progress (as Contractor)..."
curl -s -X POST "$API_GATEWAY/projects/$PROJECT_ID/progress" \
  -H "Authorization: Bearer $CONTRACTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 2,
    "notes": "Planning utility layout."
  }' > /dev/null

echo ">>> Creating Client Report (as Admin - restricted endpoint)..."
curl -s -X POST "$API_GATEWAY/client-reports" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Project Kickoff Report\",
    \"projectId\": $PROJECT_ID,
    \"summary\": \"The project is officially in the planning phase for infrastructure.\",
    \"KPIs\": [
      { \"name\": \"Safety\", \"value\": \"100%\", \"target\": \"100%\" }
    ]
  }" > /dev/null

echo ">>> Dummy data seeding complete!"
