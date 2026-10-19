#!/bin/bash
set -e

echo "=== [CI/CD Deploy] Starting AlikoHub Production Deployment ==="

# Navigate to project directory
if [ -n "$DEPLOY_DIR" ] && [ -d "$DEPLOY_DIR" ]; then
  cd "$DEPLOY_DIR"
elif [ -d "/root/Home-Project" ]; then
  cd "/root/Home-Project"
elif [ -d "/root/Aliko_backend" ]; then
  cd "/root/Aliko_backend"
fi

# Disable NX interactive TUI and daemon for CI/CD
export NX_DAEMON=false
export NX_TUI=false
export CI=true
unset NODE_OPTIONS

echo "--> Current working directory: $(pwd)"
echo "--> Pulling latest code..."
git pull origin main || git pull origin master || true

echo "--> Installing dependencies..."
npm install

echo "--> Generating Prisma clients..."
npm run prisma:generate:all || {
  npx prisma generate --schema=apps/user-service/prisma/schema.prisma
  npx prisma generate --schema=apps/academy-service/prisma/schema.prisma
  npx prisma generate --schema=apps/contech-service/prisma/schema.prisma
  npx prisma generate --schema=apps/events-service/prisma/schema.prisma
  npx prisma generate --schema=apps/careers-service/prisma/schema.prisma
  npx prisma generate --schema=apps/financial-service/prisma/schema.prisma
}

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
if command -v pm2 &> /dev/null; then
  pm2 start ecosystem.config.cjs --update-env || pm2 restart ecosystem.config.cjs --update-env
  pm2 save
fi

echo "=== [CI/CD Deploy] Deployment Complete & Live! ==="
