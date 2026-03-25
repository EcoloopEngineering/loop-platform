#!/usr/bin/env bash
# ============================================
# Loop Platform — Local Development Starter
# ============================================
export PATH="$HOME/.nvm/versions/node/v20.20.1/bin:$PATH"

echo "🔧 Loop Platform Dev"
echo "===================="

# Kill existing processes
fuser -k 3000/tcp 2>/dev/null
fuser -k 9000/tcp 2>/dev/null
sleep 1

# Ensure Docker (PostgreSQL) is running
if ! docker ps | grep -q loop-postgres; then
  echo "🐘 Starting PostgreSQL..."
  docker compose up -d 2>/dev/null
  sleep 3
fi

# Build shared if needed
if [ ! -d "packages/shared/dist" ]; then
  echo "📦 Building shared package..."
  pnpm --filter @loop/shared build
fi

# Build API
echo "🔨 Building API..."
cd apps/api
npx prisma generate 2>/dev/null
npx nest build 2>&1 | tail -1

# Start API
echo "🚀 Starting API on :3000..."
node dist/main.js &
API_PID=$!
sleep 3

# Start Frontend
echo "🎨 Starting Frontend on :9000..."
cd ../web
pnpm dev &
WEB_PID=$!

echo ""
echo "✅ Services starting..."
echo "   API:      http://localhost:3000"
echo "   Swagger:  http://localhost:3000/api/docs"
echo "   Frontend: http://localhost:9000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup on exit
trap "kill $API_PID $WEB_PID 2>/dev/null; echo '🛑 Stopped'" EXIT
wait
