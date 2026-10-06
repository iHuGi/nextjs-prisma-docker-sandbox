# Next.js App Router Sandbox

A lightweight engineering sandbox for exploring and validating modern **Next.js App Router** patterns with **TypeScript**, **PostgreSQL**, **Prisma 7**, and **Docker**.

The project focuses on backend-oriented application design, strong runtime validation, persistent data access, feature-based modularity, and reproducible containerized development environments.

## Overview

The application contains small, isolated features designed to exercise the complete request lifecycle:

```text
Client UI
   ↓
Feature Hook
   ↓
Next.js API Route
   ↓
Runtime Validation (Zod)
   ↓
Business Logic
   ↓
Prisma ORM
   ↓
PostgreSQL
```

The goal is not to build a production product, but to use a deliberately small codebase to experiment with architectural patterns that scale to larger applications.

---

## Tech Stack

| Layer             | Technology               |
| ----------------- | ------------------------ |
| Framework         | Next.js — App Router     |
| Language          | TypeScript               |
| UI                | React                    |
| Styling           | CSS Modules + Global CSS |
| Runtime           | Node.js LTS              |
| API               | Next.js Route Handlers   |
| Validation        | Zod                      |
| Database          | PostgreSQL               |
| ORM               | Prisma 7                 |
| PostgreSQL Driver | `pg`                     |
| Prisma Adapter    | `@prisma/adapter-pg`     |
| Containerization  | Docker + Docker Compose  |

### Engineering Principles

* Strict TypeScript typing across application boundaries
* Runtime validation for untrusted request payloads
* Feature-based organization
* Separation of UI, state management, routing, and persistence concerns
* Persistent PostgreSQL storage through Docker volumes
* Explicit database constraints instead of relying exclusively on application-level validation
* Reproducible local development through Docker

---

## Project Structure

```text
.
├── app/
│   ├── api/
│   │   ├── age/
│   │   │   └── route.ts
│   │   │       # Typed API endpoint for age calculation
│   │   │
│   │   └── club/
│   │       └── route.ts
│   │           # Typed API endpoint for football club validation
│   │
│   ├── age/
│   │   ├── components/
│   │   │   ├── AgeForm.tsx
│   │   │   │   # Client-side form UI
│   │   │   └── AgeForm.module.css
│   │   │       # Scoped component styles
│   │   │
│   │   ├── hooks/
│   │   │   └── useAgeCalculator.ts
│   │   │       # Feature state and API interaction
│   │   │
│   │   └── page.tsx
│   │       # Age feature route
│   │
│   ├── club/
│   │   ├── components/
│   │   │   ├── ClubForm.tsx
│   │   │   │   # Client-side form UI
│   │   │   └── ClubForm.module.css
│   │   │       # Scoped component styles
│   │   │
│   │   ├── hooks/
│   │   │   └── useClubValidator.ts
│   │   │       # Feature state and API interaction
│   │   │
│   │   └── page.tsx
│   │       # Club feature route
│   │
│   ├── components/
│   │   └── Footer.tsx
│   │       # Shared application footer and navigation
│   │
│   ├── globals.css
│   │   # Global application styles
│   │
│   ├── layout.tsx
│   │   # Root layout and application shell
│   │
│   └── page.tsx
│       # Main dashboard
│
├── prisma/
│   └── schema.prisma
│       # Database schema and Prisma models
│
├── prisma.config.ts
│   # Prisma 7 project configuration
│
├── docker-compose.yml
│   # Containerized application and PostgreSQL environment
│
├── Dockerfile
│   # Application image definition
│
└── package.json
    # Project dependencies and npm scripts
```

---

## Feature Architecture

Features are organized vertically rather than grouping all components, hooks, and logic into global directories.

For example:

```text
app/age/
├── components/
├── hooks/
└── page.tsx
```

This keeps feature-specific concerns close together and makes individual features easier to understand, modify, or remove.

The architecture separates responsibilities into:

```text
page.tsx
    │
    ├── Components
    │      └── Presentation / User Interaction
    │
    └── Hooks
           └── State Management / API Calls

API Route
    │
    ├── Request Validation
    ├── Business Logic
    └── Prisma
           └── PostgreSQL
```

Shared application-level components remain under:

```text
app/components/
```

while feature-specific components remain inside their respective feature directories.

---

## Data Integrity & Validation

The project uses multiple layers of protection to keep invalid data away from the persistence layer.

### Runtime Input Validation

Incoming API requests are treated as untrusted input.

Request payloads are validated using **Zod** before any database operation is performed.

Typical validation responsibilities include:

* Required fields
* Data types
* Email format
* Allowed values
* Invalid or malformed request payloads

Invalid input is rejected with an appropriate `400 Bad Request` response instead of reaching the database layer.

### Type Safety

TypeScript provides compile-time guarantees, but request bodies received through HTTP are runtime data and cannot be trusted solely because TypeScript defines an interface.

API routes therefore treat incoming values as `unknown` and deliberately narrow them through validation before executing application logic.

This creates a clear boundary:

```text
unknown request data
        ↓
runtime validation
        ↓
validated typed data
        ↓
business logic
        ↓
database
```

### Database Constraints

Database integrity is enforced at the schema level whenever possible.

Both `AgeRecord` and `ClubRecord` use a unique constraint on:

```prisma
email @unique
```

This prevents duplicate records for the same email address at the database level.

---

## Prisma Upsert Strategy

Mutation endpoints use Prisma `upsert` operations for email-anchored persistence.

Conceptually:

```text
Request
  │
  ├── email already exists
  │      └── UPDATE existing record
  │
  └── email does not exist
         └── CREATE new record
```

This avoids manually implementing:

```text
SELECT → if exists UPDATE → else INSERT
```

and instead delegates the operation to the database/ORM layer through Prisma.

The result is idempotent submission behavior for the feature records while preserving the database uniqueness constraint.

---

## PostgreSQL Date Handling

Temporal data such as birth dates uses PostgreSQL's native `DATE` type rather than a timestamp when a time-of-day value is not meaningful.

Prisma models therefore use:

```prisma
DateTime @db.Date
```

This avoids unnecessary timezone semantics for calendar-only values and preserves the intended database representation.

---

## Prisma 7 PostgreSQL Adapter

Prisma 7 uses the PostgreSQL driver adapter configuration used by this project:

```text
Prisma
   ↓
@prisma/adapter-pg
   ↓
pg
   ↓
PostgreSQL
```

The project includes:

* `@prisma/adapter-pg` — PostgreSQL driver adapter for Prisma
* `pg` — PostgreSQL client for Node.js
* `@types/pg` — TypeScript definitions for `pg`

Prisma project configuration is defined through:

```text
prisma.config.ts
```

with the database schema maintained under:

```text
prisma/schema.prisma
```

---

## Running with Docker

The recommended development environment is Docker-based.

### Build and start

```bash
docker compose up -d --build
```

### Check running containers

```bash
docker compose ps
```

### Application

Open:

```text
http://localhost:3000
```

### Follow application logs

```bash
docker compose logs -f
```

### Stop the environment

```bash
docker compose down
```

The PostgreSQL database is backed by a Docker volume so that database state survives normal container restarts and recreations.

---

## Database Management

### Apply the current Prisma schema

```bash
npx prisma db push
```

### Launch Prisma Studio

```bash
npx prisma studio
```

### Connect directly to PostgreSQL

```bash
docker compose exec postgres_db psql -U postgres -d postgres
```

This is useful for inspecting the database directly and debugging issues independently of Prisma.

---

## Local Development Without Docker

Node.js LTS is required for running the application outside the containerized environment.

Install dependencies:

```bash
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

Environment-specific configuration should be provided through a local `.env` file.

Do not commit secrets, credentials, or environment-specific database connection strings to source control.

---

## Troubleshooting

### Prisma Studio: WSL + Docker Connectivity

A common development issue occurs when Prisma Studio is launched from a WSL terminal while PostgreSQL is running inside Docker.

The important distinction is between:

```text
WSL / Host
    │
    │ localhost:5432
    ▼
Published Docker Port
    │
    ▼
PostgreSQL Container
```

and the internal Docker network:

```text
Application Container
        │
        ▼
Docker Internal Network
        │
        ▼
PostgreSQL Container
```

Tools running outside the PostgreSQL container should use the host-published port rather than attempting to resolve the database through Docker's internal service network.

### Port Conflicts

If Prisma Studio fails to start because its port is already occupied, identify and terminate the process from WSL:

```bash
fuser -k 51212/tcp
```

You can also terminate lingering Prisma Studio processes:

```bash
pkill -f "prisma studio"
```

### Explicit Prisma Studio Binding

When browser auto-launch or host/WSL routing behaves unexpectedly, start Prisma Studio explicitly:

```bash
npx prisma studio --browser none --port 51212
```

This makes the Studio port explicit and avoids relying on automatic browser handling.

---

## Key Implementation Notes

### Next.js App Router

The application uses the App Router model:

```text
app/
```

Routes are derived from the directory structure, while server/client boundaries are explicitly defined where required.

### Feature-Based Modularity

Business logic is kept close to the feature that owns it.

Custom hooks encapsulate client-side state and API interaction, while presentation remains isolated inside feature components.

### API Boundary

Next.js Route Handlers provide the backend HTTP boundary:

```text
POST /api/age
POST /api/club
```

The API layer is responsible for validating input, executing business logic, and interacting with persistence.

### Strong Typing

TypeScript strictness is maintained across the application, including explicit typing around React events, request payloads, and database interactions.

### Persistent Storage

PostgreSQL runs in Docker with persistent volume storage, ensuring that application restarts do not implicitly destroy database state.

---

## Project Goals

This sandbox is primarily intended to evaluate and reinforce:

* Next.js App Router architecture
* TypeScript strict typing
* React component boundaries
* Custom hook design
* API route design
* Runtime validation with Zod
* PostgreSQL persistence
* Prisma 7 integration
* Database constraints and upsert semantics
* Dockerized development workflows
* WSL/Docker interoperability

The project deliberately keeps the business domain simple so that architectural and infrastructure concerns remain easy to isolate and inspect.

---

## Development Philosophy

The implementation favors explicit boundaries over implicit behavior:

```text
UI
 ↓
Hook
 ↓
API
 ↓
Validation
 ↓
Business Logic
 ↓
ORM
 ↓
Database
```

Each layer has a clear responsibility, making the project easier to debug, reason about, and extend without tightly coupling presentation code to persistence concerns.
