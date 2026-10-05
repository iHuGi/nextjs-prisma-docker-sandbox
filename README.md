# Next.js App Router Sandbox

A lightweight experimental project built to evaluate and understand **Next.js (App Router)** architecture, strongly-typed server-side API routes (`TypeScript`), feature-based modularity, persistent database integration via **Prisma 7**, and containerized deployment workflows using **Docker**.


## Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript (Strict Type Safety)
* **Database & ORM:** PostgreSQL, Prisma 7 (with `@prisma/adapter-pg`)
* **Runtime & Environment:** Node.js (LTS), Docker & Docker Compose
* **Styling & UI:** CSS Modules (Scoped), React Hooks (`useState`), Custom Hooks for business logic
* **Architecture:** Feature-based modular design separating logic (Hooks), UI (Components), and Routing (Pages).


## Project Structure

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


## Installed Dependencies

To support the PostgreSQL adapter configuration required by **Prisma 7**, the following packages were added to the project:

* **`@prisma/adapter-pg`** — Official Prisma driver adapter for PostgreSQL.
* **`pg`** — Native PostgreSQL client for Node.js.
* **`@types/pg`** — TypeScript definitions for the `pg` client.


## Running with Docker & Database Management

This project is fully containerized for local development and persistence.

1. **Build and start the containers:**

```bash
docker compose up -d --build
```

2. **Access the application:**
Open your browser and navigate to:

```text
http://localhost:3000
```

3. **Check container logs (useful for debugging backend/API errors):**
```bash
docker compose logs -f
```

4. **Stop the environment:**
```bash
docker compose down
```


## 🗄️ Database & Prisma Commands

* **Push schema changes directly to the database:**
```bash
npx prisma db push
```

* **Open Prisma Studio (Visual DB Inspector):**
```bash
npx prisma studio
```

* **Access the PostgreSQL container shell:**
```bash
docker compose exec postgres_db psql -U postgres -d postgres
```


## 🛠️ Key Implementation Notes

* **App Router Paradigm:** Uses directory-based routing (`app/`) for server/client component boundaries.
* **Feature-Based Modularity:** Business logic is abstracted into custom hooks and UI is isolated in dedicated components.
* **Strongly Typed Architecture:** Type safety enforced across forms using modern React event typing (`React.SyntheticEvent`).
* **Prisma 7 Configuration:** Relies on `prisma.config.ts` for database connection management and `@prisma/adapter-pg` for query handling.
* **Persistent Storage:** Configured with Docker volumes to ensure database state survives container restarts.


## ⚙️ Prerequisites & Local Setup

If you want to run or develop locally outside of Docker, ensure you have **Node.js (LTS)** installed, then install the dependencies:

```bash
npm install
```