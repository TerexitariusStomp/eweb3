#!/bin/bash

# EDN Blockchain Recorder Deployment Script for Hostinger VPS
# Run with: bash deploy.sh

set -e  # Exit on any error

echo "================================================"
echo "EDN Blockchain Recorder - Deployment Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/edn-blockchain-recorder"
BACKEND_DIR="$APP_DIR/backend"
NGINX_CONF="/etc/nginx/sites-available/edn-blockchain-recorder"
DOMAIN="terexitariusstomps.github.io"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}" 
   exit 1
fi

echo -e "${GREEN}Step 1: System Updates${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}Step 2: Install Dependencies${NC}"
# Install Node.js 18.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi
echo "PM2 version: $(pm2 -v)"

# Install Nginx
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt install -y nginx
fi
echo "Nginx version: $(nginx -v)"

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

echo -e "${GREEN}Step 3: Create Application Directory${NC}"
mkdir -p $APP_DIR
mkdir -p $BACKEND_DIR/logs

echo -e "${GREEN}Step 4: Copy Application Files${NC}"
# Assuming this script is run from the project directory
echo "Copying backend files..."
cp -r backend/* $BACKEND_DIR/

echo -e "${GREEN}Step 5: Install NPM Dependencies${NC}"
cd $BACKEND_DIR
npm install --production

echo -e "${GREEN}Step 6: Environment Configuration${NC}"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from template...${NC}"
    cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env
    echo -e "${RED}IMPORTANT: Edit $BACKEND_DIR/.env with your configuration!${NC}"
    echo "Press any key to continue after editing .env..."
    read -n 1 -s
fi

echo -e "${GREEN}Step 7: Configure Nginx${NC}"
# Copy nginx configuration
cp deployment/nginx.conf $NGINX_CONF

# Update domain in nginx config
sed -i "s/yourdomain.com/$DOMAIN/g" $NGINX_CONF

# Create symlink
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

echo -e "${GREEN}Step 8: Setup SSL Certificate${NC}"
echo "Setting up Let's Encrypt SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || true

echo -e "${GREEN}Step 9: Configure Firewall${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}Step 10: Start Application with PM2${NC}"
cd $BACKEND_DIR

# Stop PM2 processes if running
pm2 delete edn-blockchain-recorder 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}Step 11: Restart Services${NC}"
systemctl restart nginx
pm2 restart all

echo -e "${GREEN}Step 12: Verify Deployment${NC}"
sleep 3

# Check if PM2 process is running
if pm2 list | grep -q "edn-blockchain-recorder"; then
    echo -e "${GREEN}✓ PM2 process is running${NC}"
else
    echo -e "${RED}✗ PM2 process failed to start${NC}"
    pm2 logs edn-blockchain-recorder --lines 50
    exit 1
fi

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
else
    echo -e "${RED}✗ Nginx failed to start${NC}"
    systemctl status nginx
    exit 1
fi

# Check if application responds
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is responding${NC}"
else
    echo -e "${RED}✗ Application is not responding${NC}"
    pm2 logs edn-blockchain-recorder --lines 50
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Application URL: https://$DOMAIN"
echo "Webhook URL: https://$DOMAIN/webhook/transaction"
echo "Health Check: https://$DOMAIN/health"
echo ""
echo "Useful Commands:"
echo "  - View logs: pm2 logs edn-blockchain-recorder"
echo "  - Restart: pm2 restart edn-blockchain-recorder"
echo "  - Stop: pm2 stop edn-blockchain-recorder"
echo "  - Monitor: pm2 monit"
echo "  - Nginx logs: tail -f /var/log/nginx/edn-blockchain-error.log"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update webhook URL in EDN system to: https://$DOMAIN/webhook/transaction"
echo "2. Grant access to authorized wallet addresses"
echo "3. Monitor logs for any issues"
echo ""
