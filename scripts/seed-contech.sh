#!/bin/bash
set -e

API_GATEWAY="http://localhost:3006"
PASSWORD="SecurePassword123!"
BYPASS="BYPASS_CAPTCHA"

echo ">>> Seeding Con-Tech specific accounts..."

# 1. Register users
register_user() {
  local EMAIL=$1
  local FIRSTNAME=$2
  local LASTNAME=$3
  echo "--- Registering $EMAIL ---"
  curl -s -X POST "$API_GATEWAY/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"firstname\": \"$FIRSTNAME\",
      \"lastname\": \"$LASTNAME\",
      \"captchaToken\": \"$BYPASS\"
    }" || true
}

register_user "client@test.alikohub.com" "Test" "Client"
register_user "contractor@test.alikohub.com" "Test" "Contractor"
register_user "admin@test.alikohub.com" "Test" "Admin"

# 2. Promote admin
echo "--- Promoting admin@test.alikohub.com to Global Admin ---"
docker exec alikohub-postgres psql -U alikohub -d alikohub_db -c "UPDATE \"User\" SET \"globalRole\" = 'ADMIN' WHERE email = 'admin@test.alikohub.com';"

# 3. Setup Con-Tech Roles
setup_contech_role() {
  local EMAIL=$1
  local ROLE=$2

  echo "--- Fetching token for $EMAIL ---"
  LOGIN_RESPONSE=$(curl -s -X POST "$API_GATEWAY/auth/login" \
    -H "Content-Type: application/json" \
    -d "{ \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\" }")
  
  TOKEN=$(echo $LOGIN_RESPONSE | grep -oP '"accessToken":"\K[^"]+')

  if [ -z "$TOKEN" ]; then
      echo "Failed to get token for $EMAIL. Output: $LOGIN_RESPONSE"
      return
  fi

  echo "--- Setting Con-Tech role $ROLE for $EMAIL ---"
  curl -s -X POST "$API_GATEWAY/profile/select-role" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{ \"role\": \"$ROLE\" }"
}

setup_contech_role "client@test.alikohub.com" "CLIENT"
setup_contech_role "contractor@test.alikohub.com" "CONTRACTOR"

echo ""
echo ">>> Con-tech specific credentials seeded and ready!"
echo "Admin:      admin@test.alikohub.com / $PASSWORD"
echo "Contractor: contractor@test.alikohub.com / $PASSWORD"
echo "Client:     client@test.alikohub.com / $PASSWORD"
