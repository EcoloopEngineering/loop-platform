<p align="center">
  <img src="apps/web/public/ecoloop_logo.png" alt="ecoLoop Logo" width="200" />
</p>

<h1 align="center">Loop Platform</h1>
<p align="center"><strong>Solar Energy CRM & Lead Management</strong></p>

---

## Overview

Loop Platform is a full-stack CRM built for solar energy companies. It provides end-to-end lead management, sales pipeline tracking, referral networks, automated design requests (via Aurora Solar), commission calculations, scheduling, live chat support, document generation, and team management — all in a mobile-first interface designed for field sales representatives and office managers alike. Native mobile apps are available via Capacitor for iOS and Android.

## Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| **Backend**   | NestJS 11, Prisma ORM 6, PostgreSQL 16, CQRS / DDD architecture  |
| **Realtime**  | Socket.io (WebSocket live chat)                                   |
| **Frontend**  | Vue 3.5, Quasar v2, Pinia, TypeScript 5.7, Vite                  |
| **Mobile**    | Capacitor (iOS + Android native builds)                           |
| **Shared**    | `@loop/shared` monorepo package (enums, constants, scoring)       |
| **Infra**     | Docker Compose, Turborepo, pnpm 10 workspaces, Husky (pre-commit)|
| **Auth**      | Firebase Authentication (Admin SDK + Client SDK)                  |
| **Security**  | Helmet (security headers), @nestjs/throttler (rate limiting)      |
| **Documents** | pdf-lib (PDF generation), @aws-sdk/client-s3 (file storage)      |
| **Email**     | Nodemailer (transactional email)                                  |
| **Integrations** | Aurora Solar, Jobber, Stripe, ZapSign, Mapbox, Firebase       |

## Project Structure

```
loop-platform/
├── apps/
│   ├── api/                    # NestJS backend (DDD / CQRS)
│   │   ├── prisma/             # Schema, migrations, seed
│   │   └── src/
│   │       ├── common/         # Guards, decorators, pipes
│   │       ├── infrastructure/
│   │       │   ├── prisma/     # Prisma service
│   │       │   ├── firebase/   # Firebase Auth
│   │       │   ├── email/      # Nodemailer transactional email
│   │       │   ├── pdf/        # pdf-lib document generation
│   │       │   └── storage/    # AWS S3 file storage (local fallback)
│   │       ├── integrations/
│   │       │   ├── aurora/     # Aurora Solar AI design
│   │       │   ├── jobber/     # Jobber field scheduling (GraphQL)
│   │       │   ├── stripe/     # Stripe payment webhooks
│   │       │   └── zapsign/    # ZapSign e-signature
│   │       └── modules/
│   │           ├── chat/       # Live chat — FAQ bot + agent handoff (WebSocket)
│   │           ├── commission/  # M1/M2/M3 commission tracking
│   │           ├── crm/        # Leads, customers, properties
│   │           ├── dashboard/  # Metrics, scoreboard
│   │           ├── design/     # Aurora Solar design requests
│   │           ├── document/   # File uploads & management
│   │           ├── form/       # Public lead-capture forms
│   │           ├── identity/   # Users, teams, referrals
│   │           ├── notification/ # Event-driven notifications
│   │           └── scheduling/ # Appointments (Jobber)
│   └── web/                    # Vue 3 / Quasar frontend
│       ├── src/
│       │   ├── boot/           # Axios, Firebase, i18n
│       │   ├── components/     # Reusable UI components
│       │   ├── composables/    # Vue composables
│       │   ├── layouts/        # Main, Auth, Admin, Basic
│       │   ├── pages/
│       │   │   ├── auth/       # Login, register
│       │   │   ├── home/       # Sales home
│       │   │   ├── leads/      # Lead list, detail, wizard
│       │   │   ├── crm/        # Pipeline board/list
│       │   │   ├── admin/      # Settings, LiveChatPage.vue
│       │   │   ├── chat/       # Customer-facing chat
│       │   │   └── profile/    # User profile
│       │   ├── router/         # Vue Router config
│       │   └── stores/         # Pinia stores
│       └── src-capacitor/      # Capacitor native app config (iOS + Android)
├── packages/
│   └── shared/                 # @loop/shared — enums, constants
├── docker-compose.yml          # PostgreSQL 16
├── turbo.json                  # Turborepo task config
├── pnpm-workspace.yaml         # Workspace definition
└── package.json                # Root scripts & engine constraints
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** & Docker Compose

### Installation

```bash
# Clone the repository
git clone <repository-url> loop-platform
cd loop-platform

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL)
docker compose up -d

# Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files with your credentials

# Run database migrations
pnpm db:migrate

# (Optional) Seed the database
pnpm db:seed

# Start all services in development mode
pnpm dev
```

### Access Points

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:9000            |
| API          | http://localhost:3000            |
| Swagger Docs | http://localhost:3000/api/docs   |

## Features

### Lead Management
- Multi-step lead creation wizard (customer, property, energy data, scoring)
- Automatic lead scoring based on roof condition, energy usage, contact quality, and property attributes
- Lead sources: door knock, cold call, referral, event, public form, website
- Lead assignment with split percentages for team selling

### Sales Pipeline
- Configurable pipeline stages (Closer pipeline and Project Manager pipeline)
- List and board views with drag-and-drop stage transitions
- Stage history and activity tracking

### CRM Dashboard
- Real-time metrics: total leads, conversion rate, kW sold, commissions earned
- Team scoreboard with leaderboard rankings
- Activity feed with recent lead events

### Live Chat System
- WebSocket-based chat via Socket.io (`/chat` namespace)
- FAQ auto-reply with keyword matching from database entries
- Agent handoff: users type "agent" to connect to a human support agent
- Conversation persistence in localStorage
- Admin Live Chat panel at `/admin/live-chat` for managing conversations
- FAQ management via REST API

### Design Integration
- Aurora Solar AI design requests directly from lead detail
- Manual design workflow support
- Design status tracking (pending, in progress, completed, failed)

### Document Generation
- Change Order PDF generation via pdf-lib
- CAP document generation with ZapSign e-signature integration
- Stage-specific automated transactional emails (INSTALL_READY, WON)

### Commission Tracking
- Three-tier commission model: M1 (60%), M2 (25%), M3 (15%)
- Automatic calculation based on kW, EPC, and split percentages
- Stripe integration for payment processing
- Advance payment support

### Referral System
- Invitation code generation per user
- Hierarchical referral tracking with commission splits
- Referral status management (pending, accepted)

### Notifications
- Event-driven notification system (stage changes, assignments, designs, appointments)
- In-app notification center with read/unread state
- Real-time polling for new notifications (every 30s)

### User & Team Management
- Role-based access control: Admin, Manager, Sales Rep, Referral Partner
- Team creation and member assignment
- User profiles with onboarding flow and goal tracking

### Document Management
- File uploads attached to leads and properties via AWS S3 (local fallback)
- Document types: utility bills, roof images, design renders, contracts, ID documents

### Scheduling
- Appointment booking for site audits and installations
- Jobber integration for field service scheduling via GraphQL
- Availability checking

### Public Forms
- Customizable lead-capture forms with unique slugs
- Public-facing form pages (no auth required)
- Automatic lead creation from form submissions

### Admin Settings
- Pipeline configuration (stages, order, colors)
- Integration management
- User preferences (language, notification emoji)

### Mobile Apps
- Native iOS and Android builds via Capacitor
- App ID: `org.ecoloop.loop.app`
- Mobile-first Sales Rep interface with 4 tabs: Home, Leads, Pipeline, Profile
- Build: `quasar build -m capacitor -T android/ios` then `cap sync && cap open`

## Security

- **Authentication**: Firebase Auth with graceful dev bypass (`NODE_ENV=development` only)
- **RBAC**: Four roles — ADMIN (full access), MANAGER (CRM + pipeline + settings), SALES_REP (4 mobile tabs), REFERRAL_PARTNER (referrals + own leads)
- **Role escalation blocked**: `role` removed from UpdateUserDto; only admins can change roles
- **CORS**: Restricted to specific allowed origins
- **Rate limiting**: 100 requests/minute via `@nestjs/throttler`
- **Helmet**: Security headers enabled globally
- **Swagger**: Disabled in production
- **WebSocket auth**: Conversation ownership verified per user
- **Secrets**: `.env` files gitignored; never commit credentials

## API Documentation

Interactive API documentation is available via Swagger at `http://localhost:3000/api/docs` when the API is running.

### Endpoint Groups

| Group           | Base Path                | Description                              |
| --------------- | ------------------------ | ---------------------------------------- |
| Identity        | `/users`, `/teams`       | User CRUD, team management, referrals    |
| Referrals       | `/referrals`             | Invitation codes, referral hierarchy     |
| CRM / Leads     | `/leads`                 | Lead CRUD, stage transitions, scoring    |
| Dashboard       | `/dashboard`             | Metrics, scoreboard, analytics           |
| Design          | `/designs`               | Aurora Solar design requests             |
| Commission      | `/commissions`           | Commission calculation and tracking      |
| Document        | `/documents`             | File upload and retrieval                |
| Doc Generation  | `/documents/generation`  | Change Order PDF, CAP document generation|
| Scheduling      | `/scheduling`            | Appointment booking, availability        |
| Form            | `/forms`                 | Form CRUD, public submissions            |
| Notification    | `/notifications`         | Notification listing, mark as read       |
| Chat            | `/chat`                  | Conversations, messages, FAQ management  |
| SalesRabbit     | `/salesrabbit`           | SalesRabbit webhook receiver             |

## Environment Variables

### API (`apps/api/.env`)

| Variable                  | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `DATABASE_URL`            | PostgreSQL connection string                     |
| `FIREBASE_PROJECT_ID`     | Firebase project identifier                      |
| `FIREBASE_CLIENT_EMAIL`   | Firebase service account email                   |
| `FIREBASE_PRIVATE_KEY`    | Firebase service account private key             |
| `AURORA_API_KEY`          | Aurora Solar API key                             |
| `AURORA_TENANT_ID`        | Aurora Solar tenant identifier                   |
| `JOBBER_CLIENT_ID`        | Jobber OAuth client ID                           |
| `JOBBER_CLIENT_SECRET`    | Jobber OAuth client secret                       |
| `STRIPE_SECRET_KEY`       | Stripe secret API key                            |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing secret                    |
| `ZAPSIGN_API_TOKEN`       | ZapSign document signing API token               |
| `SMTP_HOST`               | SMTP server host for Nodemailer                  |
| `SMTP_PORT`               | SMTP server port                                 |
| `SMTP_USER`               | SMTP authentication username                     |
| `SMTP_PASS`               | SMTP authentication password                     |
| `SMTP_FROM`               | Default "from" email address                     |
| `AWS_ACCESS_KEY_ID`       | AWS access key for S3                            |
| `AWS_SECRET_ACCESS_KEY`   | AWS secret key for S3                            |
| `AWS_S3_BUCKET`           | S3 bucket name for file storage                  |
| `AWS_S3_REGION`           | AWS region for S3 bucket                         |

### Frontend (`apps/web/.env`)

| Variable              | Description                                |
| --------------------- | ------------------------------------------ |
| `API_URL`             | Backend API base URL (default: `http://localhost:3000`) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox GL token for address autocomplete   |

## Testing

```bash
cd apps/api
npx jest                    # Run all tests
npx jest --coverage         # With coverage report
npx jest path/to/file.spec.ts  # Single file
```

- **23 test suites, 129 tests**
- Coverage threshold: 80% (branches, functions, lines, statements)
- Mock helper: `src/test/prisma-mock.helper.ts`
- Pre-commit hook (Husky) runs tests automatically — commits are blocked if tests fail
- Tests are co-located with source: `foo.service.ts` has `foo.service.spec.ts` in the same directory

## Architecture

Loop Platform follows **Domain-Driven Design (DDD)** with **CQRS** (Command Query Responsibility Segregation) on the backend:

- **Modules** are organized by bounded context (CRM, Identity, Commission, Design, Chat, etc.)
- Each module contains `application/` (commands, queries, handlers), `domain/` (entities, events, repositories), `infrastructure/` (Prisma repository implementations), and `presentation/` (controllers, DTOs)
- **Commands** handle write operations (e.g., `CreateLeadHandler`, `BookAppointmentHandler`)
- **Queries** handle read operations (e.g., `GetDashboardHandler`, `GetAvailabilityHandler`)
- **Domain Events** drive cross-module communication — for example, a lead stage change emits an event that the Notification module listens to and creates user notifications
- **Guards** enforce Firebase JWT authentication and role-based access control
- **WebSocket Gateway** handles real-time chat via Socket.io with conversation ownership verification

The frontend uses **Pinia stores** with persisted state, **Vue composables** for reusable logic, and **Quasar components** for a consistent mobile-first UI. Native mobile builds are produced via **Capacitor**.

## Scripts

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Start all apps in development mode        |
| `pnpm build`       | Build all apps for production             |
| `pnpm test`        | Run test suites                           |
| `pnpm lint`        | Lint all packages                         |
| `pnpm db:generate` | Regenerate Prisma client                  |
| `pnpm db:migrate`  | Run database migrations                   |
| `pnpm db:seed`     | Seed the database                         |

## CI/CD

- GitHub Actions: `.github/workflows/ci.yml`
- 3 parallel jobs: Build & Test, Lint, Security Audit
- Runs on PR to main and push to main
- PostgreSQL service container for tests
- Pre-commit hook (Husky) blocks commits locally if tests fail

## License

This software is **proprietary** and confidential. All rights reserved by EcoLoop. Unauthorized copying, distribution, or modification is strictly prohibited.
