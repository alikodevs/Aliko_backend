#!/bin/bash
set -e

# Configuration
API_GATEWAY="http://localhost:3006"
PASSWORD="SecurePassword123!"
BYPASS_CAPTCHA="BYPASS_CAPTCHA"

echo ">>> Seeding test accounts..."

# ============================================
# Core System Seed (Auth & Gateway)
# ============================================

ADMIN_EMAIL="admin.system@alikohub.com"
ADMIN_PASSWORD="SecurePassword123!"

echo "Step 1: Registering System Admin Account..."
curl -s -X POST "$API_GATEWAY/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"firstname\": \"System\",
    \"lastname\": \"Admin\",
    \"captchaToken\": \"$BYPASS_CAPTCHA\"
  }" || echo "Admin registration already exists or failed"

echo "Step 2: Promoting System Admin to Global ADMIN role..."
PG_CONTAINER=$(docker ps -f "name=postgres" -q)
if [ -z "$PG_CONTAINER" ]; then
    echo "Error: Could not find postgres container"
    exit 1
fi

docker exec $PG_CONTAINER psql -U alikohub -d alikohub_db -c "UPDATE \"auth\".\"User\" SET \"globalRole\" = 'ADMIN' WHERE email = '$ADMIN_EMAIL';"

echo "Step 3: Verifying Admin Status..."
docker exec $PG_CONTAINER psql -U alikohub -d alikohub_db -c "SELECT email, \"globalRole\" FROM \"auth\".\"User\" WHERE email = '$ADMIN_EMAIL';"

echo "Step 4: Logging in and obtaining Token..."
LOGIN_RES=$(curl -s -X POST "$API_GATEWAY/auth/login" \
  -H "Content-Type: application/json" \
  -d "{ \"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\" }")

TOKEN=$(echo $LOGIN_RES | grep -oP '"accessToken":"\K[^"]+')

if [ -z "$TOKEN" ]; then
    echo "ERROR: Failed to get admin token. Response: $LOGIN_RES"
    exit 1
fi

echo "Step 5: Syncing Admin across all domains..."
curl -s -X POST "$API_GATEWAY/auth/sync/careers" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API_GATEWAY/auth/sync/contech" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API_GATEWAY/auth/sync/events" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$API_GATEWAY/auth/sync/academy" -H "Authorization: Bearer $TOKEN"

# ============================================
# Domain-Specific content (Recruiters, etc.)
# ============================================

echo "Step 6: Creating Recruiter staff..."
curl -s -X POST "$API_GATEWAY/auth/recruiter" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"recruiter.test@alikohub.com\",
    \"password\": \"$PASSWORD\",
    \"firstname\": \"Test\",
    \"lastname\": \"Recruiter\"
  }" || echo "Recruiter already exists"

# Standard User for testing dashboard
echo "Step 7: Registering standard test user..."
curl -s -X POST "$API_GATEWAY/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"user.test@alikohub.com\",
    \"password\": \"$PASSWORD\",
    \"firstname\": \"Test\",
    \"lastname\": \"User\",
    \"captchaToken\": \"$BYPASS_CAPTCHA\"
  }" || echo "User already exists"

echo ">>> Seeding completed successfully!"
echo "Admin: $ADMIN_EMAIL"
echo "Recruiter: recruiter.test@alikohub.com"
echo "User: user.test@alikohub.com"
echo "Common Password: $PASSWORD"
