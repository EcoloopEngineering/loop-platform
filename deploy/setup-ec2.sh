#!/bin/bash
# ============================================
# Loop Platform - EC2 Setup Script
# Run this on a fresh Ubuntu 22.04 EC2 instance
# ============================================
set -e

echo "=== Loop Platform EC2 Setup ==="

# 1. Update system
echo "→ Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
echo "→ Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Install Docker Compose
echo "→ Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Node.js 20 (for Prisma migrations)
echo "→ Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# 5. Install Nginx + Certbot (for SSL)
echo "→ Installing Certbot..."
sudo apt install -y certbot

# 6. Clone repo
echo "→ Cloning repository..."
cd /home/ubuntu
git clone git@github.com:EcoloopEngineering/loop-platform.git
cd loop-platform

# 7. Create .env file
echo "→ Creating .env file..."
cat > deploy/.env << 'ENVEOF'
# === Database ===
DB_HOST=localhost
DB_USER=loop
DB_PASS=CHANGE_ME_STRONG_PASSWORD
DB_NAME=loop_platform

# === Auth ===
JWT_SECRET=CHANGE_ME_RANDOM_STRING_64_CHARS

# === AWS (set these manually) ===
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME

# === Sentry ===
SENTRY_DSN=CHANGE_ME

# === Email ===
NODEMAILER_USER=CHANGE_ME
NODEMAILER_PASS=CHANGE_ME

# === Aurora ===
AURORA_SERVICE_URL=CHANGE_ME
AURORA_SERVICE_TOKEN=CHANGE_ME

# === ZapSign ===
ZAPSIGN_API_URL=https://api.zapsign.com.br/api
ZAPSIGN_API_TOKEN=CHANGE_ME

# === Stripe ===
STRIPE_SECRET_KEY=CHANGE_ME

# === Mapbox ===
MAPBOX_ACCESS_TOKEN=CHANGE_ME
ENVEOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit deploy/.env and change DB_PASS and JWT_SECRET"
echo "  2. Get SSL certificate: sudo certbot certonly --standalone -d dev.ecoloop.app"
echo "  3. Build frontend: cd apps/web && pnpm install && npx quasar build"
echo "  4. Copy frontend to nginx: sudo cp -r dist/spa/* /usr/share/nginx/html/"
echo "  5. Start services: cd deploy && docker-compose --env-file .env -f docker-compose.prod.yml up -d"
echo "  6. Run migrations: cd apps/api && npx prisma migrate deploy"
echo ""
