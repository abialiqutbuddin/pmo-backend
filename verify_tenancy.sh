#!/bin/bash
set -e

# Base URL
URL="http://localhost:4000"

# 1. Create Tenant A
echo "Creating Tenant A..."
TENANT_A=$(curl -s -X POST "$URL/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme",
    "adminName": "Acme Admin",
    "adminEmail": "admin@acme.com",
    "adminPassword": "password123"
  }')
echo "Tenant A Response: $TENANT_A"
TENANT_A_ID=$(echo $TENANT_A | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Tenant A ID: $TENANT_A_ID"

# 2. Login Tenant A
echo "Logging in as Tenant A..."
LOGIN_A=$(curl -s -X POST "$URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_A_ID" \
  -d '{
    "email": "admin@acme.com",
    "password": "password123"
  }')
# Extract Access Token (simple grep/sed)
TOKEN_A=$(echo $LOGIN_A | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token A acquired."

# 3. Create Tenant B
echo "Creating Tenant B..."
TENANT_B=$(curl -s -X POST "$URL/tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Globex Inc",
    "slug": "globex",
    "adminName": "Globex Admin",
    "adminEmail": "admin@globex.com",
    "adminPassword": "password123"
  }')
echo "Tenant B Response: $TENANT_B"
TENANT_B_ID=$(echo $TENANT_B | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Tenant B ID: $TENANT_B_ID"

# 4. Login Tenant B
echo "Logging in as Tenant B..."
LOGIN_B=$(curl -s -X POST "$URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_B_ID" \
  -d '{
    "email": "admin@globex.com",
    "password": "password123"
  }')
TOKEN_B=$(echo $LOGIN_B | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token B acquired."

# 5. List Users for Tenant A (should see Acme Admin)
echo "Listing Users for Tenant A..."
USERS_A=$(curl -s -X GET "$URL/users" \
  -H "x-tenant-id: $TENANT_A_ID" \
  -H "Authorization: Bearer $TOKEN_A")
echo "Users A: $USERS_A"

# 6. List Users for Tenant B (should see Globex Admin, NOT Acme Admin)
echo "Listing Users for Tenant B..."
USERS_B=$(curl -s -X GET "$URL/users" \
  -H "x-tenant-id: $TENANT_B_ID" \
  -H "Authorization: Bearer $TOKEN_B")
echo "Users B: $USERS_B"

# Check isolation
if echo "$USERS_B" | grep -q "Acme"; then
  echo "FAIL: Tenant B sees Acme users!"
  exit 1
else
  echo "SUCCESS: Tenant B does not see Acme users."
fi

echo "Verification Complete."
