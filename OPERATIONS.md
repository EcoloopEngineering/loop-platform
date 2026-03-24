# OPERATIONS.md — Loop Platform

Comprehensive operations and integration reference for the engineering team.

---

## 1. Infrastructure Overview

### Architecture Diagram

```
                          +---------------------+
                          |   GitHub Actions CI  |
                          | (Build/Test/Lint/    |
                          |  Security Audit)     |
                          +----------+----------+
                                     |
                                     v
+------------------+       +--------------------+       +-------------------+
|                  |       |                    |       |                   |
|  Vue 3 / Quasar |<----->|   NestJS API       |<----->|  PostgreSQL 16    |
|  Frontend        |  HTTP |   (DDD / CQRS)     |Prisma |  (Docker)         |
|  :9000           |       |   :3000            |       |  :5432            |
|                  |       |                    |       |                   |
+------------------+       +--------+-----------+       +-------------------+
       |                            |
       |  Capacitor                 |  Integrations
       v                            |
+------------------+       +--------+-----------+
|  iOS / Android   |       |  Aurora Solar       |
|  Mobile Apps     |       |  Jobber (GraphQL)   |
+------------------+       |  Stripe             |
                           |  ZapSign            |
                           |  Firebase (Google+FCM)|
                           |  AWS S3             |
                           |  Nodemailer (Gmail) |
                           |  Mapbox             |
                           |  Sentry             |
                           |  CloudWatch         |
                           +--------------------+
                                    |
                           +--------+-----------+
                           |  Socket.io          |
                           |  Live Chat Gateway  |
                           |  /chat namespace    |
                           +--------------------+
```

### Services

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| API | NestJS 11, TypeScript | 3000 | Backend — DDD/CQRS architecture, REST + WebSocket |
| Frontend | Vue 3, Quasar v2, Pinia | 9000 | SPA with mobile-first design for sales reps |
| Database | PostgreSQL 16 (Alpine) | 5432 | Primary data store via Prisma ORM |
| Redis | Redis 7 (Alpine) | 6379 | Cache layer (Docker container: `loop-redis`) |
| WebSocket | Socket.io | 3000 | Live chat — same port as API, `/chat` namespace |

---

## 2. Database

### Connection Details

| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `loop_platform` |
| User | `loop` |
| Password | `loop_dev_2026` |
| Container | `loop-postgres` |
| Image | `postgres:16-alpine` |
| Connection URL | `postgresql://loop:loop_dev_2026@localhost:5432/loop_platform?schema=public` |

### Prisma Commands

```bash
# Generate Prisma client
pnpm --filter @loop/api exec prisma generate

# Run migrations
pnpm --filter @loop/api exec prisma migrate deploy

# Create a new migration
pnpm --filter @loop/api exec prisma migrate dev --name <migration_name>

# Open Prisma Studio (GUI)
pnpm --filter @loop/api exec prisma studio

# Reset database (destructive)
pnpm --filter @loop/api exec prisma migrate reset
```

### Key Tables (28 models)

| Model | Context | Purpose |
|-------|---------|---------|
| `User` | Identity | Users with roles (ADMIN, MANAGER, SALES_REP, REFERRAL) |
| `UserFinance` | Identity | User financial data (bank info, tax details) |
| `UserDevice` | Identity | Push notification device tokens |
| `UserOnboarding` | Identity | Onboarding completion tracking |
| `UserGoal` | Identity | Sales goals and targets |
| `Team` | Identity | Team grouping for users |
| `Referral` | Identity | Referral chain tracking (M1/M2/M3) |
| `Customer` | CRM | Customer contact information |
| `Property` | CRM | Property/address data for solar installs |
| `Pipeline` | CRM | Pipeline configuration (stages, types) |
| `PipelineStage` | CRM | Individual stage definitions |
| `Lead` | CRM | Core lead entity — the main business object |
| `LeadAssignment` | CRM | Lead ownership (primary + secondary) |
| `LeadScore` | CRM | AI/manual lead scoring |
| `LeadActivity` | CRM | Activity log per lead |
| `LeadQuote` | CRM | Solar project quotes |
| `DesignRequest` | Design | Aurora Solar design request tracking |
| `Appointment` | Scheduling | Jobber appointment sync |
| `Commission` | Commission | M1/M2/M3 commission calculations |
| `Document` | Document | Uploaded files (S3 or local) |
| `Notification` | Notification | In-app notifications |
| `Form` | Form | Public lead-capture form definitions |
| `FormSubmission` | Form | Form submission data |
| `CompanyMetrics` | Dashboard | Aggregated company KPIs |
| `Conversation` | Chat | Live chat conversations |
| `Message` | Chat | Chat messages (user, bot, agent) |
| `FaqEntry` | Chat | FAQ entries for auto-reply bot |
| `AppSetting` | System | Application-wide settings |

---

## 3. Authentication

### Auth System

The platform supports two authentication methods:

1. **JWT-based auth (primary)** — email/password login. POST /auth/login returns JWT token. 7-day expiry.
2. **Firebase Auth (Google Login only)** — used ONLY for "Continue with Google" button. Firebase SDK handles Google OAuth, then backend verifies the Firebase token.
3. **Firebase Cloud Messaging** — used for push notifications on mobile (iOS/Android via Capacitor)

### JWT Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `JWT_SECRET` | Set in `.env` | Secret key for signing tokens |
| `JWT_EXPIRY` | `7d` | Token expiration — 7 days |
| Algorithm | HS256 | Default JWT signing algorithm |

### Session Management

- Tokens expire after 7 days
- Activity-based refresh: active users get extended sessions
- `lastLoginAt` field on User tracks last authentication
- `passwordHash` stored on User model (null for Firebase-only users)

### Firebase (Google Login + Push Notifications)

- **Project**: `loop-app-b49cb`
- **Purpose**: Google Login ("Continue with Google" button) + FCM push notifications on mobile
- **NOT used for**: Email/password auth (that's JWT-based)
- **Dev bypass**: When `NODE_ENV=development` and Firebase private key is not set, the API uses the first active database user for all requests
- **Config**:
  - `FIREBASE_PROJECT_ID` — Firebase project identifier
  - `FIREBASE_CLIENT_EMAIL` — Service account email
  - `FIREBASE_PRIVATE_KEY` — Service account private key (production only)

### How Tokens Work

1. User logs in with email/password or Firebase
2. API validates credentials and issues a JWT
3. Frontend stores JWT and sends it as `Authorization: Bearer <token>` header
4. `AuthGuard` validates the JWT on every request
5. In development without Firebase, the guard bypasses auth and uses the first active DB user

---

## 4. Integrations

### Aurora Solar (AI Design)

| Property | Value |
|----------|-------|
| Purpose | AI-powered solar panel design generation |
| Base URL | `AURORA_SERVICE_URL` (Cloud Run endpoint) |
| Auth | Bearer token via `AURORA_SERVICE_TOKEN` |
| Protocol | REST (HTTP) |

**How it works:**
- When a lead is created with `designType: 'AI_DESIGN'`, Aurora is called in the background
- Creates a project with property address and customer data
- Returns design details (panel layout, estimated production)
- Lead starts at `DESIGN_READY` stage instead of `NEW_LEAD`

**Methods:**
- `createProject(input)` — Create a new Aurora project
- `getDesigns(projectId)` — Get all designs for a project
- `getDesignStatus(projectId)` — Check design generation status

**Testing:** Set `AURORA_SERVICE_URL` and `AURORA_SERVICE_TOKEN` in `.env`. Mock the service in unit tests.

---

### Jobber (Field Scheduling)

| Property | Value |
|----------|-------|
| Purpose | Appointment scheduling, field crew management |
| Base URL | `JOBBER_SERVICE_URL` (`https://api.getjobber.com/api`) |
| Auth | Bearer token via `JOBBER_SERVICE_TOKEN` |
| Protocol | GraphQL |

**How it works:**
- Queries available time slots based on location and service type
- Creates bookings (jobs) with customer and property data
- Supports rescheduling and cancellation of visits

**Methods:**
- `getAvailabilitySlots(type, lat, lng, start, end)` — Query available slots
- `createBooking(input)` — Create a new job/booking
- `rescheduleVisit(visitId, start, end)` — Reschedule an existing visit
- `cancelVisit(visitId)` — Cancel a visit

**Testing:** Use `JOBBER_SERVICE_URL` and `JOBBER_SERVICE_TOKEN`. All calls are GraphQL mutations/queries.

---

### Stripe (Payments)

| Property | Value |
|----------|-------|
| Purpose | Payment processing |
| Auth | `STRIPE_SECRET_KEY` (API), `STRIPE_PUBLISHABLE_KEY` (Frontend) |
| Protocol | Stripe SDK |

**How it works:**
- Creates payment intents for USD transactions
- Retrieves payment status
- Webhook receiver for async payment events (requires `STRIPE_WEBHOOK_SECRET`)

**Methods:**
- `createPayment(amount, userId)` — Create a payment intent
- `getPayment(paymentId)` — Retrieve payment details
- `constructEvent(rawBody, signature)` — Verify webhook events

**Testing:** Use Stripe test keys (prefix `sk_test_`). Webhook testing via Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook`.

---

### ZapSign (E-Signatures)

| Property | Value |
|----------|-------|
| Purpose | Electronic signature for CAP documents |
| Base URL | `ZAPSIGN_API_URL` (`https://api.zapsign.com.br/api`) |
| Auth | Bearer token via `ZAPSIGN_API_TOKEN` |
| Protocol | REST |

**How it works:**
- API generates a CAP (Customer Agreement Package) PDF via pdf-lib
- Document is uploaded to ZapSign for signature
- Tracks document status (pending, signed, refused)

**Methods:**
- `createDocument(input)` — Upload document for signing
- `signDocument(signerToken)` — Trigger signature
- `getDocumentStatus(docToken)` — Check signing status
- `isConfigured()` — Check if ZapSign token is set

---

### Mapbox (Address Autocomplete)

| Property | Value |
|----------|-------|
| Purpose | Address autocomplete in lead creation wizard |
| Token | `MAPBOX_ACCESS_TOKEN` (API), `VITE_MAPBOX_ACCESS_TOKEN` (Frontend) |
| Protocol | Mapbox Geocoding API |

**How it works:**
- Frontend lead wizard uses Mapbox for US address autocomplete
- Returns structured address data (street, city, state, zip, coordinates)
- Coordinates used for Jobber availability queries

---

### Nodemailer (Transactional Email)

| Property | Value |
|----------|-------|
| Purpose | Transactional emails (stage changes, notifications) |
| Provider | Gmail SMTP |
| Auth | `NODEMAILER_USER` + `NODEMAILER_PASS` (app password) |

**How it works:**
- Sends HTML emails for lead stage transitions (INSTALL_READY, WON, etc.)
- Supports attachments (PDF documents)
- From address defaults to `"ecoLoop" <NODEMAILER_USER>`
- Gracefully degrades if not configured (logs warning, returns false)

---

### AWS S3 (File Storage)

| Property | Value |
|----------|-------|
| Purpose | Document and file uploads |
| Bucket | `AWS_S3_BUCKET` (`loop-platform-uploads`) |
| Region | `AWS_REGION` (`us-east-2`) |
| Auth | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |

**How it works:**
- Uploads files to S3 with content type
- Generates signed URLs for temporary access (default 1 hour)
- Public URL format: `https://{bucket}.s3.{region}.amazonaws.com/{key}`
- Falls back to local disk when S3 is not configured

**Methods:**
- `upload({ key, body, contentType })` — Upload file to S3
- `delete(key)` — Delete file from S3
- `getSignedUrl(key, expiresIn)` — Generate pre-signed URL
- `getPublicUrl(key)` — Get permanent public URL
- `isConfigured()` — Check if S3 credentials are set

---

### Socket.io (Live Chat)

| Property | Value |
|----------|-------|
| Purpose | Real-time live chat with FAQ bot and agent handoff |
| Namespace | `/chat` |
| Port | 3000 (same as API) |
| CORS | `localhost:9000`, `localhost:9001`, `loop.ecoloop.app`, `app.ecoloop.us` |

**How it works:**
1. Visitor starts conversation via `start_conversation` event
2. Bot sends welcome message and attempts FAQ auto-replies
3. User types "agent", "human", or "person" to request human agent
4. Agent joins via admin Live Chat panel (`/admin/live-chat`)
5. All messages persisted to database (Conversation + Message models)

**WebSocket Events:**

| Event | Direction | Description |
|-------|-----------|-------------|
| `start_conversation` | Client -> Server | Create new conversation |
| `join_conversation` | Client -> Server | Join existing conversation |
| `send_message` | Client -> Server | Send user message |
| `agent_message` | Client -> Server | Send agent message |
| `agent_join` | Client -> Server | Agent joins conversation |
| `close_conversation` | Client -> Server | Close conversation |
| `conversation_started` | Server -> Client | Conversation created with welcome |
| `conversation_loaded` | Server -> Client | Existing conversation data |
| `new_message` | Server -> Client | New message in conversation |
| `agent_requested` | Server -> All | User requested human agent |
| `agent_joined` | Server -> Room | Agent joined conversation |
| `conversation_closed` | Server -> Room | Conversation ended |

---

## 5. Logging & Monitoring

### Winston (Local File Logs)

Log files are written to the `logs/` directory in the API root:

| File Pattern | Level | Retention | Format |
|-------------|-------|-----------|--------|
| `combined-YYYY-MM-DD.log` | All (info+) | 7 days | JSON |
| `error-YYYY-MM-DD.log` | Error only | 30 days | JSON |

- Max file size: 10 MB per file (rotated daily)
- Console output: colorized, human-readable format
- Log level configurable via `LOG_LEVEL` env var (default: `info`)
- Default metadata: `{ service: 'loop-api', env: NODE_ENV }`

### CloudWatch (Production Logs)

Enabled automatically when AWS credentials are present (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`).

| Log Group | Stream Pattern | Retention | Content |
|-----------|---------------|-----------|---------|
| `/loop-platform/api` | `combined-YYYY-MM-DD` | 30 days | All info+ logs |
| `/loop-platform/api` | `errors-YYYY-MM-DD` | 90 days | Error logs only |
| `/loop-platform/audit` | `audit-YYYY-MM-DD` | 365 days | Audit trail (POST/PUT/PATCH/DELETE) |

**How to access:** AWS Console -> CloudWatch -> Log groups -> `/loop-platform/api` or `/loop-platform/audit`

### Sentry (Error Tracking)

| Property | Value |
|----------|-------|
| DSN | Set via `SENTRY_DSN` env var |
| Environment | Matches `NODE_ENV` |
| Release | `loop-api@{APP_VERSION}` (default `1.0.0`) |
| Traces Sample Rate | 20% in production, 100% in dev |
| Test mode | Events suppressed when `NODE_ENV=test` |

**Features:**
- HTTP integration for request tracing
- Sensitive data scrubbing (password, token, secret, authorization)
- Ignored errors: `ECONNRESET`, `EPIPE`, `ECONNREFUSED`, `ThrottlerException`
- Helper functions: `captureError(error, context)`, `setSentryUser(user)`

**How to access:** Sentry dashboard for the project. Errors with 500+ status codes are captured automatically.

### Audit Interceptor

The `AuditInterceptor` is applied globally and logs all state-changing HTTP requests:

- **Methods logged:** POST, PUT, PATCH, DELETE
- **Data captured:** method, URL, userId, userEmail, IP, duration (ms), status code, sanitized request body, response ID
- **Sensitive fields redacted:** password, passwordHash, token, secret, creditCard, ssn
- **Error tracking:** Failed requests logged with error message and status code
- **Destination:** Console + local files + CloudWatch audit stream (365-day retention)

---

## 6. Security

### Headers & Rate Limiting

| Feature | Configuration |
|---------|--------------|
| Helmet | Enabled globally (CSP disabled, COEP disabled) |
| Rate limiting | 100 requests per minute per IP (`@nestjs/throttler`) |
| Validation | Whitelist mode — unknown properties stripped, non-whitelisted rejected |

### CORS Whitelist

```
http://localhost:9000      (local frontend)
http://localhost:9001      (local frontend alt)
https://loop.ecoloop.app   (production)
https://app.ecoloop.us     (production alt)
```

Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Allowed headers: Content-Type, Authorization
Credentials: enabled

### Dev Bypass

- Auth bypass only works when `NODE_ENV=development` and Firebase is not configured
- When Firebase private key is not set, the API auto-authenticates as the first active DB user
- **Never runs in production** — Firebase credentials required in prod

### RBAC (4 Roles)

| Role | Access Level |
|------|-------------|
| ADMIN | Full access — all modules, settings, user management, live chat panel |
| MANAGER | CRM, pipeline management, settings, team oversight, reports |
| SALES_REP | Mobile-first: Home, Leads, Pipeline, Profile. Lead CRUD, stage transitions |
| REFERRAL_PARTNER | Referral submissions, own lead tracking, commission viewing |

- Role escalation blocked: `role` field removed from `UpdateUserDto`
- Only admins can change roles via dedicated endpoint
- RBAC guards check role on every protected endpoint

### Swagger

- Available at `http://localhost:3000/api/docs` in development
- **Disabled in production** (`NODE_ENV=production`)
- Requires Bearer token authentication

### WebSocket Security

- Conversation ownership verified — users can only access their own conversations
- Same CORS whitelist as REST API

---

## 7. CI/CD

### GitHub Actions (`.github/workflows/ci.yml`)

Triggers: push to `main`, pull request to `main`
Concurrency: cancels in-progress runs for the same ref

| Job | Timeout | Description |
|-----|---------|-------------|
| Build & Test | 15 min | Build shared + API, run tests with coverage, upload coverage artifact |
| Lint | 10 min | ESLint on API code |
| Security Audit | 5 min | `pnpm audit --audit-level=high` |

**Build & Test job details:**
1. PostgreSQL 16 service container (user: `loop`, password: `loop_test`, db: `loop_test`)
2. pnpm 10, Node.js 20
3. `pnpm install --frozen-lockfile`
4. Build shared package, generate Prisma client, build API
5. Run tests with coverage (`test:cov -- --ci --forceExit --passWithNoTests`)
6. Upload coverage report (14-day retention)
7. Coverage summary comment on PRs (via vitest-coverage-report-action)

### Pre-Commit Hook (Husky)

File: `.husky/pre-commit`

What it does:
1. Ensures Node 20+ is on PATH
2. Builds shared package (`pnpm --filter @loop/shared build`)
3. Runs API tests (`npx jest --forceExit --passWithNoTests`)
4. **Blocks commit if any test fails**

### Coverage Threshold

- 80% minimum for branches, functions, lines, and statements
- Enforced by Jest config and CI pipeline

---

## 8. Testing

### Configuration

- **Framework:** Jest (via NestJS)
- **Location:** Tests are co-located with source files (`foo.service.ts` -> `foo.service.spec.ts`)
- **Mock helper:** `apps/api/src/test/prisma-mock.helper.ts`

### Current Count

- **33 test suites**
- **207 tests**

### Running Tests

```bash
cd apps/api

# Run all tests
./node_modules/.bin/jest --forceExit

# Run with coverage
./node_modules/.bin/jest --coverage --forceExit

# Run a single file
./node_modules/.bin/jest path/to/file.spec.ts --forceExit

# Run tests matching a pattern
./node_modules/.bin/jest --testPathPattern="crm" --forceExit
```

**Important:** Use `./node_modules/.bin/jest` instead of `npx jest`. The `npx` command can resolve to a different Jest version and cause unexpected behavior.

### Writing Tests

- Every new feature, service, handler, or listener MUST have a co-located `.spec.ts` test file
- Use `PrismaService` mock from `src/test/prisma-mock.helper.ts`
- Mock external services (Aurora, Jobber, Stripe, etc.)
- Aim for 80%+ coverage on new code

---

## 9. Environment Variables Reference

### API (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `APP_PORT` | No | API port (default: 3000) |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `JWT_EXPIRY` | No | Token expiration (default: `7d`) |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | No | Firebase service account key (prod only) |
| `STRIPE_SECRET_KEY` | No | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signature verification |
| `AURORA_SERVICE_URL` | No | Aurora Solar API base URL |
| `AURORA_SERVICE_TOKEN` | No | Aurora Solar API auth token |
| `JOBBER_SERVICE_URL` | No | Jobber API base URL |
| `JOBBER_SERVICE_TOKEN` | No | Jobber API auth token |
| `ZAPSIGN_API_URL` | No | ZapSign API base URL |
| `ZAPSIGN_API_TOKEN` | No | ZapSign API auth token |
| `NODEMAILER_USER` | No | Gmail address for sending emails |
| `NODEMAILER_PASS` | No | Gmail app password |
| `AWS_ACCESS_KEY_ID` | No | AWS access key (S3 + CloudWatch) |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key (S3 + CloudWatch) |
| `AWS_REGION` | No | AWS region (default: `us-east-2`) |
| `AWS_S3_BUCKET` | No | S3 bucket name (default: `loop-platform-uploads`) |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `MAPBOX_ACCESS_TOKEN` | No | Mapbox geocoding token |
| `HUBSPOT_SERVICE_URL` | No | HubSpot service URL |
| `HUBSPOT_SERVICE_TOKEN` | No | HubSpot service auth token |
| `DISCORD_SERVICE_URL` | No | Discord bot notification URL |
| `DISCORD_SERVICE_TOKEN` | No | Discord bot auth token |
| `PRIVATE_SERVICE_TOKEN` | No | Internal service-to-service auth |
| `INTERCOM_APP_ID` | No | Intercom application ID |
| `INTERCOM_SECRET_KEY` | No | Intercom API secret |
| `LOG_LEVEL` | No | Winston log level (default: `info`) |
| `APP_VERSION` | No | Release version for Sentry (default: `1.0.0`) |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | API base URL (`http://localhost:3000`) |
| `VITE_FIREBASE_API_KEY` | No | Firebase web SDK API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase Cloud Messaging sender |
| `VITE_FIREBASE_APP_ID` | No | Firebase web app ID |
| `STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key |
| `MAPBOX_ACCESS_TOKEN` | No | Mapbox token |
| `VITE_MAPBOX_ACCESS_TOKEN` | No | Mapbox token (Vite-exposed) |
| `INTERCOM_APP_ID` | No | Intercom app ID |
| `INTERCOM_API_URL` | No | Intercom API URL |
| `WEB_PUSH_NOTIFICATION_TOKEN` | No | Web push VAPID public key |
| `PRIVACY_POLICY` | No | Privacy policy URL |
| `TERMS_AND_CONDITIONS` | No | Terms and conditions URL |

---

## 10. Common Operations

### Starting Locally

```bash
# 1. Start infrastructure
docker compose up -d          # PostgreSQL on :5432, Redis on :6379

# 2. Install dependencies
pnpm install

# 3. Build shared package
pnpm --filter @loop/shared build

# 4. Setup database
pnpm --filter @loop/api exec prisma generate
pnpm --filter @loop/api exec prisma migrate deploy

# 5. Start API (Terminal 1)
cd apps/api && npx nest build && node dist/main.js

# 6. Start Frontend (Terminal 2, requires Node 20+)
cd apps/web && pnpm dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Frontend: http://localhost:9000

### Adding a New Integration

1. Create a directory under `apps/api/src/integrations/<name>/`
2. Create the service file (`<name>.service.ts`) with ConfigService for env vars
3. Create types file (`<name>.types.ts`) and mapper (`<name>.mapper.ts`)
4. Create a module (`<name>.module.ts`) that imports `HttpModule` from `@nestjs/axios`
5. Register the module in `apps/api/src/integrations/integrations.module.ts`
6. Add env vars to `.env` and document them here
7. Write tests (`<name>.service.spec.ts`)

### Adding a New Pipeline Stage

1. Update the `LeadStage` enum in `packages/shared/src/enums.ts`
2. Rebuild shared: `pnpm --filter @loop/shared build`
3. Update pipeline stage configuration via the Admin Settings UI
4. Add any stage-specific email templates if needed

### Creating a New Module

1. Create directory under `apps/api/src/modules/<name>/`
2. Follow DDD structure:
   ```
   <name>/
     domain/
       entities/
       events/
       services/
     application/
       commands/
       queries/
       dto/
       listeners/
     presentation/
       <name>.controller.ts
     <name>.module.ts
   ```
3. Register the module in `apps/api/src/app.module.ts`
4. Write tests for each service, handler, and controller

### Deployment (CD)

Automated deployment via GitHub Actions (`.github/workflows/deploy-dev.yml`):
- Triggers on push to `main` branch (after CI passes on PR)
- SSH into EC2 instance, pulls latest code, builds, and restarts services
- Frontend deployed to `/var/www/html/` (served by Nginx)
- API restarted as background process
- Health check verifies deployment via `/api/v1/settings` endpoint
- Required secrets: `EC2_SSH_KEY`, `EC2_HOST`

---

## 11. Mobile Apps

### Capacitor Setup

| Property | Value |
|----------|-------|
| Framework | Capacitor |
| App ID | `org.ecoloop.loop.app` |
| App Name | Loop by ecoLoop |
| Android Scheme | `https` |
| Web Directory | `../dist/spa` (relative to src-capacitor) |

### Plugins

| Plugin | Configuration |
|--------|--------------|
| PushNotifications | Badge, sound, alert presentation options |
| SplashScreen | 2s duration, teal background (#00897B), center crop |
| StatusBar | Light style, teal background (#00897B) |
| Keyboard | Body resize mode, resize on fullscreen |

### Building for Android

```bash
cd apps/web

# Build the web app in SPA mode for Capacitor
quasar build -m capacitor -T android

# Sync native project
npx cap sync

# Open in Android Studio
npx cap open android
```

### Building for iOS

```bash
cd apps/web

# Build the web app in SPA mode for Capacitor
quasar build -m capacitor -T ios

# Sync native project
npx cap sync

# Open in Xcode
npx cap open ios
```

### Mobile Interface

Sales reps use a mobile-first interface with 4 tabs:
- **Home** — Dashboard with greeting, recent activity, quick stats
- **Leads** — Paginated lead list with search
- **Pipeline** — Visual pipeline board
- **Profile** — User settings and profile management
