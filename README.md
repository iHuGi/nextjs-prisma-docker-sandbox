# Next.js App Router Sandbox

A lightweight experimental project built to evaluate and understand **Next.js (App Router)** architecture, strongly-typed server-side API routes (`TypeScript`), feature-based modularity, persistent database integration via **Prisma 7**, and containerized deployment workflows using **Docker**.

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript (Strict Type Safety)
* **Database & ORM:** PostgreSQL, Prisma 7 (with `@prisma/adapter-pg`)
* **Runtime & Environment:** Node.js (LTS), Docker & Docker Compose
* **Styling & UI:** CSS Modules (Scoped), React Hooks (`useState`), Custom Hooks for business logic
* **Architecture:** Feature-based modular design separating logic (Hooks), UI (Components), and Routing (Pages).

## 📁 Project Structure

```text
app/
├── api/
│   ├── age/
│   │   └── route.ts                 # Strictly typed backend endpoint for age calculation
│   └── club/
│       └── route.ts                 # Strictly typed backend endpoint for football club validation
├── age/
│   ├── components/
│   │   ├── AgeForm.tsx              # Age calculator frontend component
│   │   └── AgeForm.module.css       # Scoped styles for the age form
│   ├── hooks/
│   │   └── useAgeCalculator.ts      # State management and API logic for the age feature
│   └── page.tsx                     # Age calculator Server Component
├── club/
│   ├── components/
│   │   ├── ClubForm.tsx             # Club validator frontend component
│   │   └── ClubForm.module.css      # Scoped styles for the club form
│   ├── hooks/
│   │   └── useClubValidator.ts      # State management and API logic for the club feature
│   └── page.tsx                     # Club validator Server Component
├── components/
│   └── Footer.tsx                   # Centralized global footer & conditional navigation
├── globals.css                      # Global styles
├── layout.tsx                       # Root layout wrapping all routes with global shell
└── page.tsx                         # Main dashboard menu
prisma/
└── schema.prisma                    # Prisma data models (AgeRecord & ClubRecord)
prisma.config.ts                     # Prisma 7 configuration file (Datasource & Client settings)

```

## 📦 Installed Dependencies

To support the PostgreSQL adapter configuration required by **Prisma 7**, the following packages were added to the project:

* **`@prisma/adapter-pg`** — Official Prisma driver adapter for PostgreSQL.
* **`pg`** — Native PostgreSQL client for Node.js.
* **`@types/pg`** — TypeScript definitions for the `pg` client.
* **`dotenv`** — Ensures local WSL environments can seamlessly load `.env` variables into `prisma.config.ts` during CLI execution.

## 🐳 Running with Docker

This project is fully containerized for local development and persistence.

1. **Build and start the containers:**

```bash
docker compose up -d --build

```

2. **Access the application:**
Open your browser and navigate to: `http://localhost:3000`
3. **Check container logs (useful for debugging backend/API errors):**

```bash
docker compose logs -f

```

4. **Stop the environment:**

```bash
docker compose down

```

## 🗄️ Database Management & Prisma

Ensure your Docker containers are running (`docker compose up -d`) so that port `5432` is exposed to your host machine before running local database commands. Thanks to `dotenv`, your local Prisma CLI will automatically read the `localhost` mapping from your root `.env` file.

* **Generate Prisma Client (Update types after schema changes):**

```bash
npx prisma generate

```

* **Push schema changes directly to the database:**

```bash
npx prisma db push

```

* **Open Prisma Studio (Visual DB Inspector):**
Launch the studio using the predefined NPM script to prevent WSL port-forwarding issues (forces port 5555):

```bash
npm run studio

```

* **Access the PostgreSQL container shell:**

```bash
docker compose exec postgres_db psql -U postgres -d postgres

```

## ⚙️ Prerequisites & Local Setup

If you want to run or develop locally outside of Docker, ensure you have **Node.js (LTS)** installed, then install the dependencies:

```bash
npm install

```

## 🏗️ Key Implementation Notes

* **App Router Paradigm:** Uses directory-based routing (`app/`) for server/client component boundaries.
* **Feature-Based Modularity:** Business logic is abstracted into custom hooks and UI is isolated in dedicated components.
* **Strongly Typed Architecture:** Type safety enforced across forms using modern React event typing (`React.SyntheticEvent`).
* **Prisma 7 Configuration:** Relies on `prisma.config.ts` for database connection management and `@prisma/adapter-pg` for query handling.
* **Persistent Storage:** Configured with Docker volumes to ensure database state survives container restarts.

## 🛡️ Data Integrity & Security Architecture

The application implements a robust, defensive data submission pipeline designed around strict integrity constraints and modern validation patterns:

* **Email-Anchored Database Upserts (`Prisma`):** Both `AgeRecord` and `ClubRecord` database models enforce a strict unique constraint on the `email` column (`@unique`). Backend mutation logic utilizes Prisma's `upsert` operations, ensuring that user submissions seamlessly update existing records or create new ones without throwing primary key violations or generating data duplicates.
* **Rigorous Input Validation (`Zod`):** Incoming API requests are intercepted and sanitized using Zod schemas. Manual defensive checks are replaced by strongly-typed validation rules (such as RFC-compliant email formats and strict type-casting from `unknown`), rejecting malformed payloads with descriptive error codes (`400 Bad Request`) before touching the persistence layer.
* **Strict Type Safety (.NET-Inspired Interface Pattern):** API routes explicitly declare request body interfaces with `unknown` types, enforcing deliberate type-narrowing and runtime safety guards prior to executing business logic or interacting with the database client.
* **Native Database Date Types:** Temporal data (such as birth dates) leverages native PostgreSQL `DATE` types (`DateTime @db.Date` via Prisma), avoiding timezone pollution and ensuring proper chronological range integrity.

## ⚠️ Troubleshooting & Common Pitfalls

### Prisma Studio Connectivity Issues (WSL & Docker Environment)

If you encounter connection refusals or timeouts when attempting to launch Prisma Studio from within the WSL terminal while running a containerized PostgreSQL instance, keep the following architectural constraints in mind:

* **Container Isolation:** The database container (`postgres_db`) runs on an isolated internal Docker bridge network. Ensure your local `.env` configuration file points to the correct host and mapped port (`localhost:5432`) when querying or running studio tools from the host machine outside the container network.
* **Port Conflicts & Zombie Processes:** If the Prisma Studio port gets stuck or fails to bind due to lingering Node processes in the WSL environment, forcefully clear the port before restarting:

```bash
fuser -k 5555/tcp
pkill -f "prisma studio"

```