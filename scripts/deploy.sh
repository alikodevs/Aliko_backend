#!/bin/bash
set -e

echo "=== [CI/CD Deploy] Starting AlikoHub Production Deployment ==="

# Navigate to project directory
DEPLOY_DIR="${DEPLOY_DIR:-/root/Aliko_backend}"
if [ -d "$DEPLOY_DIR" ]; then
  cd "$DEPLOY_DIR"
fi

# Disable NX interactive TUI and daemon for CI/CD
export NX_DAEMON=false
export NX_TUI=false
export CI=true
unset NODE_OPTIONS

echo "--> Pulling latest code..."
git pull origin main || git pull origin master

echo "--> Installing dependencies..."
npm install

echo "--> Generating Prisma clients..."
npx prisma generate --schema=apps/user-service/prisma/schema.prisma
npx prisma generate --schema=apps/academy-service/prisma/schema.prisma
npx prisma generate --schema=apps/contech-service/prisma/schema.prisma
npx prisma generate --schema=apps/events-service/prisma/schema.prisma
npx prisma generate --schema=apps/careers-service/prisma/schema.prisma
npx prisma generate --schema=apps/financial-service/prisma/schema.prisma

echo "--> Building production microservices..."
npx nx run-many --target=build --all

echo "--> Syncing database schemas..."
./node_modules/.bin/prisma db push --schema=./apps/user-service/prisma/schema.prisma --accept-data-loss || true
./node_modules/.bin/prisma db push --schema=./apps/academy-service/prisma/schema.prisma --accept-data-loss || true
./node_modules/.bin/prisma db push --schema=./apps/contech-service/prisma/schema.prisma --accept-data-loss || true
./node_modules/.bin/prisma db push --schema=./apps/events-service/prisma/schema.prisma --accept-data-loss || true
./node_modules/.bin/prisma db push --schema=./apps/careers-service/prisma/schema.prisma --accept-data-loss || true
./node_modules/.bin/prisma db push --schema=./apps/financial-service/prisma/schema.prisma --accept-data-loss || true

echo "--> Reloading PM2 processes..."
pm2 start ecosystem.config.cjs --update-env || pm2 restart ecosystem.config.cjs --update-env
pm2 save

echo "=== [CI/CD Deploy] Deployment Complete & Live! ==="
