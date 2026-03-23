# CLAUDE.md — Loop Platform

## What is this project?
Solar energy CRM & lead management platform for ecoLoop. Monorepo with NestJS API, Vue 3/Quasar frontend, and shared package.

## Tech Stack
- **API**: NestJS 11, Prisma ORM, PostgreSQL 16, CQRS/DDD, EventEmitter2
- **Web**: Vue 3, Quasar v2, Pinia, TypeScript
- **Shared**: `@loop/shared` — enums, constants (dual CJS/ESM build)
- **Infra**: Docker, Turborepo, pnpm workspaces, GitHub Actions CI

## Project Structure
```
apps/
  api/           # NestJS backend (DDD: domain → application → presentation)
    prisma/      # Schema + migrations
    src/
      common/    # Guards, decorators, pipes
      infrastructure/  # Prisma, Firebase, Email (nodemailer), PDF (pdf-lib)
      integrations/    # Aurora, Jobber, Stripe, HubSpot, ZapSign
      modules/         # CRM, Design, Scheduling, Commission, Notification, Document, Form, Dashboard, Identity
  web/           # Vue 3 + Quasar frontend
    src/
      components/  # Reusable (EBtn, EInput, pipeline/, wizard/)
      composables/ # useLeadWizard
      layouts/     # Main, Auth, Basic, Admin
      pages/       # auth/, home/, leads/, crm/, admin/, profile/
      stores/      # Pinia stores (lead, pipeline, customer, user, auth)
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

## Key Conventions

### Backend
- **DDD structure**: Each module has `domain/` (entities, events, services), `application/` (commands, queries, dto, listeners), `presentation/` (controllers)
- **CQRS**: Commands for writes, Queries for reads, via NestJS `CommandBus`/`QueryBus`
- **Events**: Use `EventEmitter2` (`@nestjs/event-emitter`) for cross-module communication, NOT the CQRS `EventBus`
- **Auth**: Firebase Auth guard with dev bypass — when Firebase not configured, uses first active DB user
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

## Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| Aurora Solar | AI solar design | Active — background enrichment on AI_DESIGN |
| Jobber | Field scheduling | Active — availability + booking sync |
| Stripe | Payments | Partial — webhook receiver only |
| ZapSign | E-signatures | Active — CAP document signing |
| Mapbox | Address autocomplete | Active — frontend wizard |
| Firebase | Auth (optional) | Active — graceful bypass in dev |
| Nodemailer | Transactional email | Active — stage change emails |

## Database
- PostgreSQL 16 via Docker (`loop-postgres` container)
- Connection: `postgresql://loop:loop_dev_2026@localhost:5432/loop_platform`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Migrations: `pnpm db:migrate`

## Testing
```bash
cd apps/api
npx jest                    # Run all tests
npx jest --coverage         # With coverage report
npx jest path/to/file.spec.ts  # Single file
```
- 14 test suites, 66 tests
- Coverage threshold: 80% (branches, functions, lines, statements)
- Mock helper: `src/test/prisma-mock.helper.ts`

## CI/CD
- GitHub Actions: `.github/workflows/ci.yml`
- 3 parallel jobs: Build & Test, Lint, Security Audit
- Runs on PR to main and push to main
- PostgreSQL service container for tests

## Environment Variables
- API: `apps/api/.env` (DB, Firebase, Stripe, Aurora, Jobber, ZapSign, Nodemailer, Mapbox)
- Web: `apps/web/.env` (Firebase web SDK, Mapbox, Stripe publishable key)
- `.env` files are gitignored — never commit them

## Common Tasks
- **Add a new pipeline stage**: Update `@loop/shared` enums + rebuild shared + update pipeline config in Settings
- **Add a new integration**: Create module in `src/integrations/`, register in `integrations.module.ts`
- **Add a new notification event**: Emit in controller/handler → handle in `lead-event.listener.ts`
- **Add a new page**: Create in `apps/web/src/pages/`, add route in `routes.ts`
