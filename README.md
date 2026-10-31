# Next.js Recruitment & Configuration Engine (App Router Sandbox)

An enterprise-grade experimental platform built to evaluate **Next.js 16 (App Router)** architecture, strongly-typed server-side API controllers (`TypeScript`), **3NF relational modeling** paired with **JSONB** document storage in **PostgreSQL**, **Prisma 7** (`@prisma/adapter-pg`), bidirectional **SMTP/IMAP email persistence**, automated integration testing via **Vitest**, and containerized workflows using **Docker**.

---

## 🧠 Engineering Philosophy & AI Orchestration (Gemini Argon)

This application was developed as an advanced engineering benchmark to evaluate **Google's Gemini Argon** model capabilities. Throughout the lifecycle of this project, **I acted as the Lead Software & Data Architect**—designing the relational schema, defining domain boundaries, orchestrating the model's implementation phases, and enforcing strict code reviews.

While Gemini Argon accelerated boilerplate generation and iterative refactoring, every architectural decision and root-cause debugging session was governed by two non-negotiable engineering principles:

1. **Database Integrity & ACID Governance First:**
   Frontend visual glitches can be patched at any stage of the software lifecycle with zero data loss. Conversely, a poorly normalized database schema or weak referential integrity is a recipe for disaster once data is persisted. All state mutations in this engine prioritize **3NF normalization**, explicit foreign key constraints, atomic `$transaction` blocks, and strict pre-validation before touching disk.
2. **Backend JSON Contracts as First-Class Citizens:**
   Data payloads crossing the network boundary between the Next.js API layer and React client components must be strictly typed and sanitized via explicit DTO interfaces.
   - _Real-World Debugging Case Study (`BigInt` Serialization):_ When migrating `User` identification and phone numbers to native 64-bit integers (`BigInt`), an unmapped endpoint (`/api/admin/users`) attempted to pass raw Prisma `BigInt` primitives directly into `NextResponse.json()`. Because the native V8 `JSON.stringify` engine does not implicitly serialize `BigInt`, the route failed silently in the UI, breaking the candidate dropdown hydration. Debugging and isolating this failure underscored why **every outbound backend payload must be explicitly sanitized and cast through strict DTO contracts** before serialization.

---

## 📧 Relational Email Engine (SMTP/IMAP — PoC)

The platform includes a persistent, bidirectional **Email Communication Engine** integrated directly with Gmail (`SMTP` via `nodemailer` and `IMAP` via `imapflow` + `mailparser`) using `.env` App Password credentials (zero bloatware configuration screens):

- **Outbound Persistence (`SentEmail`):** Dispatches emails directly to registered platform users (`User` table lookup), storing the subject, body, target `userId`, and RFC 5322 `Message-ID`.
- **Inbound Synchronization & Filtering (`ReceivedEmail`):** Polls and ingests incoming emails exclusively from verified addresses registered in the `User` table, featuring mutable `isRead` boolean flags (`Read` / `Unread` filters).
- **Bidirectional Relational Threading (Cross-Referenced Nullable FKs):**
  - **Inbound Replies to Outbound Emails:** When a registered user replies to an outbound email, the IMAP sync engine inspects the RFC 5322 `In-Reply-To` / `References` headers and links `ReceivedEmail.sentEmailId -> SentEmail.id`.
  - **Outbound Replies to Inbound Emails (`replyToReceivedId`):** Clicking Reply on an inbound email routes to `/emails/send?replyToReceivedId=<id>`, pre-fills the recipient context, sets the RFC 5322 `In-Reply-To` header, and persists the outbound record with `SentEmail.receivedEmailId -> ReceivedEmail.id`.

> ### ⚠️ PoC Notice & External SMTP Delivery Caveats (Important for Forks)
> This email module is provided as an **architectural Proof of Concept (PoC)** demonstrating relational 3NF email threading and SMTP/IMAP orchestration. If you fork or test this repository against real external mailboxes, keep the following production nuances in mind:
> 1. **External Receiver Filtering (Outlook / Hotmail Silent Drops):** While dispatching an email through `nodemailer` over Gmail SMTP (`smtp.gmail.com` with an official Google App Password) succeeds and records the message in your Gmail **Sent** folder, external providers with aggressive edge heuristics (such as Microsoft Outlook / Exchange Online Protection) may silently drop automated `ESMTPSA` messages originating from residential/dynamic IPs—especially when using short plain-text test strings (e.g., `Subject: "Teste email"`). Manual emails sent from the native Gmail web UI will arrive normally, whereas scripted local SMTP dispatches may be filtered at the destination gateway before reaching the recipient's Inbox or Junk folder. Production deployments should use a dedicated transactional email provider (e.g., AWS SES, SendGrid, Resend) with verified domain SPF, DKIM, and DMARC DNS records.
> 2. **Docker Multi-Stage TypeScript Compilation:** `@types/nodemailer` and `@types/mailparser` are intentionally placed in production `dependencies` inside `package.json` to ensure TypeScript type-checking succeeds smoothly across containerized builds.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (Strict Type Safety & `.NET`-inspired DTO Interfaces)
- **Database & ORM:** PostgreSQL, Prisma 7 (`@prisma/adapter-pg`, `pg` connection pooling)
- **Email Protocols:** `nodemailer` (SMTP dispatch), `imapflow` (IMAP synchronization), `mailparser` (MIME parsing)
- **Validation:** Zod (Runtime schema validation & payload sanitization)
- **Testing:** Vitest (End-to-end API, Email Engine & PostgreSQL integration test suite)
- **Styling & UI:** Scoped CSS Modules, Dark-Mode Design System, Collapsible DAG Sections, Controlled Modals
- **Runtime & Deployment:** Node.js 22 (LTS), Docker & Docker Compose

---

## 📁 Project Structure

```text
├── __tests__/
│   └── integration.test.ts             # Vitest integration suite against live PostgreSQL
├── app/
│   ├── admin/
│   │   └── config/
│   │       ├── components/
│   │       │   ├── AdminConfig.module.css  # Scoped dark-theme styles for Admin Engine
│   │       │   └── AdminConfigForm.tsx     # Dynamic Section/Question CRUD, DAG builder & Trash view
│   │       ├── hooks/
│   │       └── page.tsx                # Admin Configuration route entry
│   ├── age/
│   │   ├── components/                 # Age calculator UI & scoped CSS
│   │   ├── hooks/                      # Custom hook (useAgeCalculator)
│   │   └── page.tsx                    # Age validation module
│   ├── api/
│   │   ├── admin/
│   │   │   ├── config/route.ts         # Controller for 3NF Sections, Questions, DAGs & JSONB submit
│   │   │   ├── countries/route.ts      # Returns master Country records (id, code, name)
│   │   │   └── users/route.ts          # Serialized User directory lookup for simulators
│   │   ├── age/route.ts                # Biological age validation & transactional AgeRecord upsert
│   │   ├── candidates/                 # Candidate configuration & submission endpoints
│   │   ├── club/route.ts               # Club business rules & transactional ClubRecord upsert
│   │   ├── emails/                     # SMTP dispatch, IMAP inbox sync & read-state controllers
│   │   ├── metadata/route.ts           # Unstructured JSONB upsert into UserMetadata
│   │   ├── results/route.ts            # Executes PL/pgSQL Stored Functions (single & paginated)
│   │   └── users/route.ts              # Master User CRUD (BigInt validation & Country FK binding)
│   ├── candidates/
│   │   └── apply/
│   │       ├── CandidateApply.module.css
│   │       ├── CandidateApplyForm.tsx  # Dynamic DAG form simulator & JSONB response hydration
│   │       └── page.tsx                # Candidate Simulator route entry
│   ├── club/
│   │   ├── components/                 # Club validator UI & scoped CSS
│   │   ├── hooks/                      # Custom hook (useClubValidator)
│   │   └── page.tsx                    # Club validation module
│   ├── components/
│   │   └── Footer.tsx                  # Global navigation footer
│   ├── emails/                         # Outbound email dispatch UI & Inbound IMAP inbox views
│   ├── lib/
│   │   ├── dtos/
│   │   │   ├── email.dto.ts            # Strict DTO contracts for SentEmail & ReceivedEmail payloads
│   │   │   └── metadata.dto.ts         # DTO sanitization contracts for user & metadata payloads
│   │   ├── validations/                # Zod validation schemas
│   │   ├── emailClient.ts              # Nodemailer SMTP & ImapFlow IMAP client wrapper
│   │   └── prisma.ts                   # Singleton Prisma 7 + pg Pool client
│   ├── results/
│   │   ├── components/                 # Consolidated JSON viewer & scoped CSS
│   │   ├── hooks/                      # Custom hook (useResultValidator)
│   │   └── page.tsx                    # Stored Procedure reporting module
│   ├── users/
│   │   ├── components/
│   │   │   ├── UsersCreate.module.css  # Scoped styles for User Management
│   │   │   └── UsersCreateForm.tsx     # Master User creation, lookup & auto-hydration form
│   │   └── page.tsx                    # User Management route entry
│   ├── globals.css                     # Global reset and theme variables
│   ├── layout.tsx                      # Root application shell
│   └── page.tsx                        # Three-row main navigation dashboard
├── postman/
│   └── postman_collection.json         # Pre-configured API request collection
├── prisma/
│   ├── migrations/                     # SQL migration history
│   ├── schema.prisma                   # 3NF + JSONB relational schema (including Email models)
│   └── seed.ts                         # Automated DB seed & PL/pgSQL Stored Function builder
├── Dockerfile                          # Multi-stage production Node 22 Alpine build
├── docker-compose.yml                  # Container orchestration (Next.js App + PostgreSQL)
├── prisma.config.ts                    # Prisma 7 datasource configuration
└── vitest.config.mjs                   # Vitest test runner configuration

```

---

## 🗄️ Relational Schema Architecture (3NF + JSONB)

The database layer enforces strict **Third Normal Form (3NF)** across core domain entities while leveraging **PostgreSQL `JSONB**` for dynamic applicant responses:

1. **`Country`:** Master reference table (`id`, `code`, `name`).
2. **`User`:** Master identity table (`id`, `email @unique`, `identificationNumber BigInt`, `phoneNumber BigInt`, `countryId` FK).
3. **`AgeRecord` & `ClubRecord`:** Strictly bound 1:1 child tables referencing `User(id)` with `ON DELETE CASCADE`. Dependent endpoints (`/api/age`, `/api/club`, `/api/metadata`) **never** create users implicitly; they enforce pre-existence checks (`404 Not Found` if the user profile is absent).
4. **`UserMetadata`:** Hybrid 1:1 table storing dynamic candidate form submissions inside a `customData` `JSONB` column.
5. **`ConfigSection` -> `ConfigQuestion` -> `ConfigAnswer`:** Hierarchical configuration engine per country, supporting conditional DAG visibility (`conditionJson`), pre-filled values, locked boolean options, custom sort ordering, and soft-delete archiving (`isArchived`).
6. **`SentEmail` & `ReceivedEmail`:** Bidirectional 3NF email tables bound to `User(id)` (`ON DELETE CASCADE`), storing RFC 5322 `messageId` identifiers, `inReplyTo` headers, `isRead` status flags, and cross-referenced nullable foreign keys (`ReceivedEmail.sentEmailId` and `SentEmail.receivedEmailId`) for full conversation threading.

---

## 🐳 Running with Docker

1. **Build and start the containers:**

```bash
docker compose build --no-cache
docker compose up -d

```

2. **Access the application:**
Navigate to `http://localhost:3000`
3. **Inspect container logs:**

```bash
docker compose logs -f

```

4. **Stop the environment:**

```bash
docker compose down

```

---

## ⚙️ Local Development, Seeding & Testing

Ensure your PostgreSQL container is running (`docker compose up -d`) so port `5432` is exposed locally, and configure your `.env` file with `DATABASE_URL` plus Gmail App Password credentials if testing live SMTP/IMAP calls.

1. **Install dependencies:**

```bash
npm install

```

2. **Synchronize Prisma Schema & Generate Client:**

```bash
npx prisma db push
npx prisma generate

```

3. **Seed Database & Compile PostgreSQL Stored Functions:**
The seed script (`prisma/seed.ts`) automatically provisions countries, sample DAG sections (Portugal & Greece), a default candidate profile, and compiles the required **PL/pgSQL Stored Functions** (`get_user_consolidated_summary` and `get_paginated_users`):

```bash
npm run seed

```

4. **Run Integration Tests (Vitest):**
Executes end-to-end tests against the live PostgreSQL database, verifying `BigInt` user creation, `404` orphan rejection on child routes, 3NF cascades, DAG configuration upserts, JSONB persistence, Stored Function execution, and relational Email Engine workflows:

```bash
npm run test

```

5. **Typecheck & Format Code:**

```bash
npx tsc --noEmit
npm run format

```

6. **Launch Prisma Studio (Port 5555):**

```bash
npm run studio

```

---

## ⚠️ Troubleshooting (WSL2 & Prisma)

* **Missing `.prisma/client/default` in Local Dev (`npm run dev`):**
If switching branches or rebuilding Docker containers invalidates local Prisma artifacts, regenerate the client before starting the dev server:
```bash
npx prisma generate

```

* **Prisma Studio Port Conflict (`5555`):**
If Prisma Studio fails to bind to port `5555` due to lingering processes in WSL2, terminate zombie processes before restarting:
```bash
fuser -k 5555/tcp
pkill -f "prisma studio"

```
---

*Architected, debugged, and validated by **Hugo Azevedo** — built in collaboration with **Google Gemini Argon**.*

