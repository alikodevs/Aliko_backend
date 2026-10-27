#!/bin/bash
# ============================================
# AlikoHub VPS Deployment Script
# ============================================
# This script deploys AlikoHub to an Ubuntu/Debian VPS
# Run as root or with sudo

set -e

APP_DIR="/opt/alikohub"
APP_USER="alikohub"
REPO_URL="https://github.com/alikodevs/Aliko_backend.git"
BRANCH="main"
NODE_VERSION="20"

echo "============================================"
echo "  AlikoHub VPS Deployment Script"
echo "============================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# ============================================
# 1. System Update & Dependencies
# ============================================
echo "[1/8] Updating system and installing dependencies..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ============================================
# 2. Install Node.js via NVM
# ============================================
echo "[2/8] Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version

# ============================================
# 3. Install PM2 Globally
# ============================================
echo "[3/8] Installing PM2..."
npm install -g pm2

# ============================================
# 4. Create Application User
# ============================================
echo "[4/8] Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -d $APP_DIR -s /bin/bash $APP_USER
fi

# ============================================
# 5. Clone/Update Repository
# ============================================
echo "[5/8] Setting up application directory..."
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    cd $APP_DIR
    sudo -u $APP_USER git fetch origin
    sudo -u $APP_USER git checkout $BRANCH
    sudo -u $APP_USER git pull origin $BRANCH
else
    echo "Cloning repository..."
    rm -rf $APP_DIR/*
    sudo -u $APP_USER git clone -b $BRANCH $REPO_URL $APP_DIR
fi

# ============================================
# 6. Install Dependencies & Build
# ============================================
echo "[6/8] Installing dependencies and building..."
cd $APP_DIR

# Install root dependencies
sudo -u $APP_USER npm install

# Install and build each service
services=(
    "domains/core-platform-services/api-gateway-service"
    "domains/core-platform-services/auth-service"
    "domains/core-platform-services/file-upload-service"
    "domains/core-platform-services/careers-service"
    "domains/academy/backend"
    "domains/con-tech/backend"
    "domains/events/backend"
)

for service in "${services[@]}"; do
    echo "Building $service..."
    cd "$APP_DIR/$service"
    sudo -u $APP_USER npm install
    
    # Run Prisma generate if prisma directory exists
    if [ -d "prisma" ]; then
        sudo -u $APP_USER npx prisma generate
    fi
    
    sudo -u $APP_USER npm run build
done

# ============================================
# 7. Configure PM2
# ============================================
echo "[7/8] Configuring PM2..."
cd $APP_DIR

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Please copy .env.production to .env and configure it:"
    echo "  cp .env.production .env"
    echo "  nano .env"
fi

# Start services with PM2
sudo -u $APP_USER pm2 start ecosystem.config.cjs --env production
sudo -u $APP_USER pm2 save

# Configure PM2 to start on boot
pm2 startup systemd -u $APP_USER --hp $APP_DIR
systemctl enable pm2-$APP_USER

# ============================================
# 8. Configure Firewall
# ============================================
echo "[8/8] Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Configure your .env file:"
echo "   cp $APP_DIR/.env.production $APP_DIR/.env"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Run database migrations:"
echo "   cd $APP_DIR && npm run sync"
echo ""
echo "3. Configure Nginx (see nginx.conf in scripts/)"
echo ""
echo "4. Set up SSL with Certbot:"
echo "   certbot --nginx -d api.alikohub.com"
echo ""
echo "5. Restart services:"
echo "   sudo -u $APP_USER pm2 restart all"
echo ""
echo "PM2 Commands:"
echo "  pm2 list          - View running services"
echo "  pm2 logs          - View all logs"
echo "  pm2 logs <name>   - View specific service logs"
echo "  pm2 restart all   - Restart all services"
echo "  pm2 monit         - Monitor resources"
echo ""
