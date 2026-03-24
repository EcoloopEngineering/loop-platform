# ============================================
# Loop Platform API - Production Dockerfile
# ============================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod=false

# --- Build shared ---
FROM deps AS build-shared
COPY packages/shared/ packages/shared/
RUN pnpm --filter @loop/shared build

# --- Build API ---
FROM build-shared AS build-api
COPY apps/api/ apps/api/
RUN cd apps/api && npx prisma generate && npx nest build

# --- Production ---
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV APP_PORT=3000

# Copy built files
COPY --from=build-api /app/apps/api/dist ./dist
COPY --from=build-api /app/apps/api/prisma ./prisma
COPY --from=build-api /app/apps/api/package.json ./
COPY --from=build-api /app/node_modules ./node_modules
COPY --from=build-api /app/packages/shared/dist ./node_modules/@loop/shared/dist
COPY --from=build-api /app/packages/shared/package.json ./node_modules/@loop/shared/

# Create uploads directory
RUN mkdir -p /app/uploads /app/logs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/dashboard || exit 1

CMD ["node", "dist/main.js"]
