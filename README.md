# Next.js App Router Sandbox

A lightweight experimental project built to evaluate and understand **Next.js (App Router)** architecture, strongly-typed server-side API routes (`TypeScript`), feature-based modularity, and containerized deployment workflows via **Docker**.

## Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript (Strict Type Safety)
* **Runtime & Environment:** Node.js (LTS), Docker & Docker Compose
* **Styling & UI:** CSS Modules (Scoped), React Hooks (`useState`, `usePathname`), Custom Hooks for business logic
* **Architecture:** Feature-based modular design separating logic (Hooks), UI (Components), and Routing (Pages).

---

## 📂 Project Structure

```text
app/
├── api/
│   ├── age/
│   │   └── route.ts                 # Strictly typed backend endpoint for precise age calculation
│   └── club/
│       └── route.ts                 # Strictly typed backend endpoint for football club validation
├── age/
│   ├── components/
│   │   ├── AgeForm.tsx              # Age calculator frontend component
│   │   └── AgeForm.module.css       # Scoped styles for the age form
│   ├── hooks/
│   │   └── useAgeCalculator.ts      # State management and API logic for the age feature
│   └── page.tsx                     # Age calculator Server Component (Route Maestro)
├── club/
│   ├── components/
│   │   ├── ClubForm.tsx             # Club validator frontend component
│   │   └── ClubForm.module.css      # Scoped styles for the club form
│   ├── hooks/
│   │   └── useClubValidator.ts      # State management and API logic for the club feature
│   └── page.tsx                     # Club validator Server Component (Route Maestro)
├── components/
│   └── Footer.tsx                   # Centralized global footer & conditional navigation
├── globals.css                      # Global styles
├── layout.tsx                       # Root layout wrapping all routes with global shell
└── page.tsx                         # Main dashboard menu

```
---

## Running with Docker

This project is fully containerized for local development and testing.

1. **Build and start the containers:**
```bash
docker compose up -d --build
```

2. **Access the application:**
Open your browser and navigate to:
```text
http://localhost:3000
```

3. **Stop the environment:**
```bash
docker compose down
```
---

## 🛠️ Key Implementation Notes

* **App Router Paradigm:** Uses directory-based routing (`app/`) instead of the legacy `pages/` directory.
* **Feature-Based Modularity:** Business logic is abstracted into custom hooks and UI is isolated in dedicated components, allowing `page.tsx` files to act cleanly as Server Components.
* **Strongly Typed Architecture:** Migrated to TypeScript (`.ts`/`.tsx`) with strict payload validation. Form submissions are strictly typed using `React.SubmitEvent<HTMLFormElement>`.
* **Scoped Styling:** Uses CSS Modules (`*.module.css`) to encapsulate styles at the component level, preventing global class collisions.
* **API Route Handlers:** Server-side logic handled via `route.ts` utilizing Next.js `NextResponse` for robust request processing.
* **DRY Layout Architecture:** The global footer and conditional routing (`usePathname`) eliminate duplicate back-navigation markup across views.