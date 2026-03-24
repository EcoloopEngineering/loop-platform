# CLAUDE.md — Loop Platform

## What is this project?
Solar energy CRM & lead management platform for ecoLoop. Monorepo with NestJS API, Vue 3/Quasar frontend, and shared package.

## Tech Stack
- **API**: NestJS 11, Prisma ORM, PostgreSQL 16, CQRS/DDD, EventEmitter2, Socket.io (WebSocket)
- **API Libraries**: pdf-lib (PDF generation), Nodemailer (transactional email), @aws-sdk/client-s3 (file storage), Helmet (security headers), @nestjs/throttler (rate limiting)
- **Web**: Vue 3, Quasar v2, Pinia, TypeScript
- **Mobile**: Capacitor (iOS + Android native apps)
- **Shared**: `@loop/shared` — enums, constants (dual CJS/ESM build)
- **Infra**: Docker, Turborepo, pnpm workspaces, GitHub Actions CI, Husky (pre-commit hooks)

## Project Structure
```
apps/
  api/           # NestJS backend (DDD: domain → application → presentation)
    prisma/      # Schema + migrations
    src/
      common/    # Guards, decorators, pipes
      infrastructure/
        prisma/        # Prisma service
        firebase/      # Firebase (Google Login + FCM Push)
        email/         # Nodemailer transactional email
        pdf/           # pdf-lib document generation
        storage/       # AWS S3 file storage with local fallback
      integrations/
        aurora/        # Aurora Solar AI design
        jobber/        # Jobber field scheduling (GraphQL)
        stripe/        # Stripe payment webhooks
        zapsign/       # ZapSign e-signature
      modules/
        crm/           # Leads, customers, properties
        chat/          # Live chat — FAQ bot + agent handoff (WebSocket)
        design/        # Aurora Solar design requests
        scheduling/    # Appointments (Jobber)
        commission/    # M1/M2/M3 commission tracking
        notification/  # Event-driven notifications
        document/      # File uploads & management
        form/          # Public lead-capture forms
        dashboard/     # Metrics, scoreboard
        identity/      # Users, teams, referrals
  web/           # Vue 3 + Quasar frontend
    src/
      components/  # Reusable (EBtn, EInput, pipeline/, wizard/)
      composables/ # useLeadWizard
      layouts/     # Main, Auth, Basic, Admin
      pages/
        auth/      # Login, register
        home/      # Sales home
        leads/     # Lead list, detail, wizard
        crm/       # Pipeline board/list
        admin/     # Settings, LiveChatPage.vue
        chat/      # Customer-facing chat
        profile/   # User profile
      stores/      # Pinia stores (lead, pipeline, customer, user, auth)
    src-capacitor/ # Capacitor native app config (iOS + Android)
packages/
  shared/        # Enums (LeadStage, UserRole, etc.), scoring weights, pipeline stages
```

## Running Locally
```bash
docker compose up -d          # PostgreSQL on :5432
pnpm install
pnpm --filter @loop/shared build
pnpm --filter @loop/api exec prisma generate
pnpm --filter @loop/api exec prisma migrate deploy
# Terminal 1: API
cd apps/api && npx nest build && node dist/main.js
# Terminal 2: Frontend (needs Node 20+)
cd apps/web && pnpm dev
```
- API: http://localhost:3000 | Swagger: http://localhost:3000/api/docs
- Frontend: http://localhost:9000

## Mandatory Rules

### ALWAYS test your code
- **Every new feature, service, handler, or listener MUST have a co-located `.spec.ts` test file**
- **Every change to existing code MUST update or add relevant tests**
- **ALWAYS run `cd apps/api && ./node_modules/.bin/jest --forceExit` before committing** — do NOT commit if tests fail
- Tests are co-located: `foo.service.ts` → `foo.service.spec.ts` in the same directory
- Use `src/test/prisma-mock.helper.ts` for PrismaService mocks
- Minimum 80% coverage (enforced by Jest config and CI)
- Pre-commit hook (Husky) runs tests automatically — commits are blocked if tests fail

## Key Conventions

### Backend
- **DDD structure**: Each module has `domain/` (entities, events, services), `application/` (commands, queries, dto, listeners), `presentation/` (controllers)
- **CQRS**: Commands for writes, Queries for reads, via NestJS `CommandBus`/`QueryBus`
- **Events**: Use `EventEmitter2` (`@nestjs/event-emitter`) for cross-module communication, NOT the CQRS `EventBus`
- **Auth**: JWT primary + Firebase for Google Login. Dev bypass when Firebase not configured uses first active DB user
- **API prefix**: All routes under `/api/v1/`
- **Tests**: Co-located with source (`*.spec.ts`), Jest, 80% coverage threshold

### Frontend
- **Theme**: Light/clean — white bg (#FFFFFF), page bg (#F8FAFB), primary teal (#00897B), Inter font
- **Components**: Use `EBtn`, `EInput` wrappers. Quasar components with `outlined dense` style
- **API calls**: Via `api` from `@/boot/axios` (baseURL includes `/api/v1`)
- **Styling**: Scoped SCSS, border-radius 12px, border #E5E7EB, shadow-sm

### Shared Package
- Build with `pnpm --filter @loop/shared build` before API build
- Dual CJS/ESM output: `dist/cjs/` and `dist/esm/`
- Jest maps to `dist/cjs/index.js`

## RBAC (Role-Based Access Control)

Four roles with distinct permissions:

| Role | Access |
|------|--------|
| **ADMIN** | Full access — all modules, settings, user management, live chat panel, pipeline config |
| **MANAGER** | CRM, pipeline management, settings, team oversight, reports |
| **SALES_REP** | Mobile-first: 4 tabs — Home, Leads, Pipeline, Profile. Lead creation, stage transitions, notes |
| **REFERRAL_PARTNER** | Limited — referral submissions, own lead tracking, commission viewing |

## Security

- **Dev bypass**: Firebase auth bypass only works when `NODE_ENV=development`
- **Role escalation blocked**: `role` field removed from `UpdateUserDto` — only admins can change roles via dedicated endpoint
- **CORS**: Restricted to specific allowed origins
- **Rate limiting**: 100 requests/minute via `@nestjs/throttler`
- **Helmet**: Security headers enabled globally
- **Swagger**: Disabled in production (`NODE_ENV=production`)
- **WebSocket auth**: Conversation ownership verified — users can only access their own chat conversations
- **RBAC enforcement**: Guards check role on every protected endpoint

## Authentication

- **JWT-based auth (primary)**: Email/password login. POST /auth/login returns JWT token. 7-day expiry.
- **Firebase Auth (Google Login only)**: Used ONLY for "Continue with Google" button. Firebase SDK handles Google OAuth, then backend verifies the Firebase token.
- **Firebase Cloud Messaging**: Used for push notifications on mobile (iOS/Android via Capacitor)
- **Dev bypass**: NODE_ENV=development + no Firebase = auto-auth as first active user
- **Session management**: 7-day token expiry, activity-based. `lastLoginAt` tracked on User model
- Tokens sent as `Authorization: Bearer <token>` header on every request

## Logging & Monitoring

### Winston (Local)
- Log directory: `logs/` in API root
- `combined-YYYY-MM-DD.log` — all info+ logs, 7-day retention, 10 MB max
- `error-YYYY-MM-DD.log` — errors only, 30-day retention, 10 MB max
- Console: colorized human-readable output
- Log level: `LOG_LEVEL` env var (default: `info`)

### CloudWatch (Production)
- Enabled when AWS credentials are present
- `/loop-platform/api` combined stream — 30-day retention
- `/loop-platform/api` errors stream — 90-day retention
- `/loop-platform/audit` audit stream — 365-day retention
- Access: AWS Console -> CloudWatch -> Log groups

### Sentry (Error Tracking)
- Configured via `SENTRY_DSN` env var
- 20% trace sampling in production, 100% in dev
- Sensitive data scrubbed (password, token, secret, authorization)
- Suppressed in test mode (`NODE_ENV=test`)
- Ignored: ECONNRESET, EPIPE, ECONNREFUSED, ThrottlerException

### Audit Interceptor
- Global interceptor on all POST/PUT/PATCH/DELETE requests
- Logs: method, URL, userId, userEmail, IP, duration, status, sanitized body
- Sensitive fields redacted: password, passwordHash, token, secret, creditCard, ssn
- Feeds into CloudWatch audit stream (365-day retention)

## Business Rules

### Lead Assignment
- **@ecoloop.us email** (employee): Lead assigned to creator
- **Other email** (partner/referral): Lead assigned to whoever sent the referral invite
- Leads always have a primary owner (`isPrimary: true` in `leadAssignment`)
- PM (Project Manager) is a separate field on the lead

### Lead Creation with AI Design
- `designType: 'AI_DESIGN'` → lead starts at `DESIGN_READY` stage (not NEW_LEAD)
- Aurora integration triggered in background to enrich with project data
- `designType: 'MANUAL_DESIGN'` → lead starts at `NEW_LEAD`

### Pipeline Stages (Closer)
NEW_LEAD → REQUEST_DESIGN → DESIGN_IN_PROGRESS → DESIGN_READY → PENDING_SIGNATURE → SIT → WON / LOST

### Notifications
- Event-driven: `lead.created`, `lead.stageChanged`, `lead.assigned`, `lead.pmAssigned`, `lead.noteAdded`
- Listeners create DB notifications + send emails (stage-specific)
- Frontend polls every 30s in AdminLayout

### Commission Tiers
- M1 (Direct Referrer): 60%
- M2 (Second Tier): 25%
- M3 (Third Tier): 15%

## Chat System

- **WebSocket gateway** at `/chat` namespace via Socket.io
- **FAQ auto-reply**: Keyword matching against FAQ entries stored in the database
- **Agent handoff**: User types "agent" to request connection to a human agent
- **Conversation persistence**: Stored in localStorage on the frontend for session continuity
- **Admin Live Chat panel**: Available at `/admin/live-chat` for agents to manage conversations
- **FAQ management**: Full CRUD via REST API for admins to configure automated responses

## Document Generation

- **Change Order PDF**: Generated via pdf-lib with lead and project data
- **CAP document**: Generated and sent to ZapSign for e-signature workflow
- **Stage-specific emails**: Automated transactional emails triggered on stage transitions (e.g., INSTALL_READY, WON)

## Mobile Apps

- **Capacitor** configured for both iOS and Android
- **App ID**: `org.ecoloop.loop.app`
- **Build workflow**:
  ```bash
  cd apps/web
  quasar build -m capacitor -T android   # or -T ios
  npx cap sync
  npx cap open android                    # or ios
  ```
- Sales reps use the mobile-first interface with 4 tabs: Home, Leads, Pipeline, Profile

## Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| Aurora Solar | AI solar design | Active — auto-enrichment on AI_DESIGN leads |
| Jobber | Field scheduling | Active — appointment sync via GraphQL |
| Stripe | Payments | Active — payment intents + webhook receiver |
| ZapSign | E-signatures | Active — CAP document signing |
| Mapbox | Address autocomplete | Active — frontend wizard (US addresses) |
| Firebase | Google Login + Push Notifications | Active — Google OAuth + FCM for mobile push |
| Nodemailer | Transactional email | Active — Gmail SMTP, stage change emails |
| AWS S3 | File storage | Active — document uploads with local fallback |
| AWS CloudWatch | Log aggregation | Active — combined/error/audit log streams |
| Sentry | Error tracking | Active — exception capture + performance tracing |
| Socket.io | Live chat | Active — FAQ bot + agent handoff |
| HubSpot | CRM sync | Active — Cloud Functions service |
| Discord | Notifications | Active — sales notification bot |

## Database
- PostgreSQL 16 via Docker (`loop-postgres` container)
- Connection: `postgresql://loop:loop_dev_2026@localhost:5432/loop_platform`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Migrations: `pnpm db:migrate`

## Testing
```bash
cd apps/api
./node_modules/.bin/jest --forceExit                    # Run all tests
./node_modules/.bin/jest --coverage --forceExit         # With coverage report
./node_modules/.bin/jest path/to/file.spec.ts --forceExit  # Single file
```
- 33 test suites, 207 tests
- Coverage threshold: 80% (branches, functions, lines, statements)
- Mock helper: `src/test/prisma-mock.helper.ts`
- Pre-commit hook (Husky) runs tests automatically — commits are blocked if tests fail
- **Important**: Use `./node_modules/.bin/jest` instead of `npx jest` — `npx` can resolve to a different Jest version and cause unexpected behavior

## CI/CD
- **CI**: GitHub Actions `.github/workflows/ci.yml` — 3 parallel jobs: Build & Test, Lint, Security Audit. Runs on PR to main and push to main. PostgreSQL service container for tests.
- **CD**: GitHub Actions `.github/workflows/deploy-dev.yml` — auto-deploys to EC2 on push to main. SSH deploy, builds API + frontend, restarts services, health check.
- Pre-commit hook (Husky) blocks commits if tests fail locally

## Environment Variables
- API: `apps/api/.env` (DB, Firebase, Stripe, Aurora, Jobber, ZapSign, Nodemailer, Mapbox, AWS S3)
- Web: `apps/web/.env` (Firebase web SDK, Mapbox, Stripe publishable key)
- `.env` files are gitignored — never commit them

## Common Tasks
- **Add a new pipeline stage**: Update `@loop/shared` enums + rebuild shared + update pipeline config in Settings
- **Add a new integration**: Create module in `src/integrations/`, register in `integrations.module.ts`
- **Add a new notification event**: Emit in controller/handler → handle in `lead-event.listener.ts`
- **Add a new page**: Create in `apps/web/src/pages/`, add route in `routes.ts`
- **Add a new FAQ entry**: Use the FAQ REST API or add via Admin Live Chat panel
- **Build mobile app**: `cd apps/web && quasar build -m capacitor -T android`
