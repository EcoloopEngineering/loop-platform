<p align="center">
  <img src="apps/web/public/ecoloop_logo.png" alt="ecoLoop Logo" width="200" />
</p>

<h1 align="center">Loop Platform</h1>
<p align="center"><strong>Solar Energy CRM & Lead Management</strong></p>

---

## Overview

Loop Platform is a full-stack CRM built for solar energy companies. It provides end-to-end lead management, sales pipeline tracking, referral networks, automated design requests (via Aurora Solar), commission calculations, scheduling, and team management — all in a mobile-first interface designed for field sales representatives and office managers alike.

## Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| **Backend**   | NestJS 11, Prisma ORM 6, PostgreSQL 16, CQRS / DDD architecture  |
| **Frontend**  | Vue 3.5, Quasar v2, Pinia, TypeScript 5.7, Vite                  |
| **Shared**    | `@loop/shared` monorepo package (enums, constants, scoring)       |
| **Infra**     | Docker Compose, Turborepo, pnpm 10 workspaces                    |
| **Auth**      | Firebase Authentication (Admin SDK + Client SDK)                  |
| **Integrations** | Aurora Solar, HubSpot, Jobber, Stripe, Mapbox, Intercom, ZapSign |

## Project Structure

```
loop-platform/
├── apps/
│   ├── api/                    # NestJS backend (DDD / CQRS)
│   │   ├── prisma/             # Schema, migrations, seed
│   │   └── src/
│   │       ├── common/         # Guards, decorators, pipes
│   │       ├── infrastructure/ # Firebase, config
│   │       ├── integrations/   # Aurora, HubSpot, Jobber, Stripe
│   │       └── modules/
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
│       └── src/
│           ├── boot/           # Axios, Firebase, i18n
│           ├── components/     # Reusable UI components
│           ├── composables/    # Vue composables
│           ├── layouts/        # Main, Auth, Admin, Basic
│           ├── pages/          # Route pages
│           ├── router/         # Vue Router config
│           └── stores/         # Pinia stores
├── packages/
│   └── shared/                 # @loop/shared — enums, constants
├── docker-compose.yml          # PostgreSQL 16 + Redis 7
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

# Start infrastructure (PostgreSQL + Redis)
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

### Design Integration
- Aurora Solar AI design requests directly from lead detail
- Manual design workflow support
- Design status tracking (pending, in progress, completed, failed)

### Commission Tracking
- Three-tier commission model: M1, M2, M3
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
- Real-time polling for new notifications

### User & Team Management
- Role-based access control: Admin, Manager, Sales Rep, Referral Partner
- Team creation and member assignment
- User profiles with onboarding flow and goal tracking

### Document Management
- File uploads attached to leads and properties
- Document types: utility bills, roof images, design renders, contracts, ID documents

### Scheduling
- Appointment booking for site audits and installations
- Jobber integration for field service scheduling
- Availability checking

### Public Forms
- Customizable lead-capture forms with unique slugs
- Public-facing form pages (no auth required)
- Automatic lead creation from form submissions

### Admin Settings
- Pipeline configuration (stages, order, colors)
- Integration management
- User preferences (language, notification emoji)

## API Documentation

Interactive API documentation is available via Swagger at `http://localhost:3000/api/docs` when the API is running.

### Endpoint Groups

| Group           | Base Path              | Description                              |
| --------------- | ---------------------- | ---------------------------------------- |
| Identity        | `/users`, `/teams`     | User CRUD, team management, referrals    |
| Referrals       | `/referrals`           | Invitation codes, referral hierarchy     |
| CRM / Leads     | `/leads`               | Lead CRUD, stage transitions, scoring    |
| Dashboard       | `/dashboard`           | Metrics, scoreboard, analytics           |
| Design          | `/designs`             | Aurora Solar design requests             |
| Commission      | `/commissions`         | Commission calculation and tracking      |
| Document        | `/documents`           | File upload and retrieval                |
| Scheduling      | `/scheduling`          | Appointment booking, availability        |
| Form            | `/forms`               | Form CRUD, public submissions            |
| Notification    | `/notifications`       | Notification listing, mark as read       |

## Environment Variables

### API (`apps/api/.env`)

| Variable                  | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `DATABASE_URL`            | PostgreSQL connection string                     |
| `REDIS_URL`               | Redis connection string                          |
| `FIREBASE_PROJECT_ID`     | Firebase project identifier                      |
| `FIREBASE_CLIENT_EMAIL`   | Firebase service account email                   |
| `FIREBASE_PRIVATE_KEY`    | Firebase service account private key             |
| `AURORA_API_KEY`          | Aurora Solar API key                             |
| `AURORA_TENANT_ID`        | Aurora Solar tenant identifier                   |
| `HUBSPOT_ACCESS_TOKEN`    | HubSpot private app access token                 |
| `HUBSPOT_PIPELINE_ID`     | HubSpot deal pipeline ID                         |
| `JOBBER_CLIENT_ID`        | Jobber OAuth client ID                           |
| `JOBBER_CLIENT_SECRET`    | Jobber OAuth client secret                       |
| `STRIPE_SECRET_KEY`       | Stripe secret API key                            |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing secret                    |
| `INTERCOM_ACCESS_TOKEN`   | Intercom API access token                        |
| `ZAPSIGN_API_TOKEN`       | ZapSign document signing API token               |

### Frontend (`apps/web/.env`)

| Variable              | Description                                |
| --------------------- | ------------------------------------------ |
| `API_URL`             | Backend API base URL (default: `http://localhost:3000`) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox GL token for address autocomplete   |

## Architecture

Loop Platform follows **Domain-Driven Design (DDD)** with **CQRS** (Command Query Responsibility Segregation) on the backend:

- **Modules** are organized by bounded context (CRM, Identity, Commission, Design, etc.)
- Each module contains `application/` (commands, queries, handlers), `domain/` (entities, events, repositories), `infrastructure/` (Prisma repository implementations), and `presentation/` (controllers, DTOs)
- **Commands** handle write operations (e.g., `CreateLeadHandler`, `BookAppointmentHandler`)
- **Queries** handle read operations (e.g., `GetDashboardHandler`, `GetAvailabilityHandler`)
- **Domain Events** drive cross-module communication — for example, a lead stage change emits an event that the Notification module listens to and creates user notifications
- **Guards** enforce Firebase JWT authentication and role-based access control

The frontend uses **Pinia stores** with persisted state, **Vue composables** for reusable logic, and **Quasar components** for a consistent mobile-first UI.

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

## License

This software is **proprietary** and confidential. All rights reserved by ecoLoop. Unauthorized copying, distribution, or modification is strictly prohibited.
