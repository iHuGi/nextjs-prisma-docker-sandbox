# Next.js App Router Sandbox

A lightweight experimental project built to evaluate and understand **Next.js (App Router)** architecture, strongly-typed server-side API routes (`TypeScript`), and containerized deployment workflows via **Docker**.

## 🚀 Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript (Strict Type Safety)
* **Runtime & Environment:** Node.js (LTS), Docker & Docker Compose
* **Styling & UI:** React Hooks (`useState`, `usePathname`), Inline Modular Styling
* **Architecture:** Component-driven design with a centralized layout and shared global footer.

---

## 📂 Project Structure

```text
app/
├── api/
│   ├── age/
│   │   └── route.ts         # Strictly typed backend endpoint for precise age calculation
│   └── club/
│       └── route.ts         # Strictly typed backend endpoint for football club validation
├── age/
│   └── page.tsx             # Age calculator frontend view
├── club/
│   └── page.tsx             # Club validator frontend view
├── components/
│   └── Footer.tsx           # Centralized global footer & conditional navigation
├── globals.css              # Global styles
├── layout.tsx               # Root layout wrapping all routes with global shell
└── page.tsx                 # Main dashboard menu
```

---

## 🐳 Running with Docker

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
* **Strongly Typed Architecture:** Migrated to TypeScript (`.ts`/`.tsx`) with strict payload validation and explicit type checking.
* **API Route Handlers:** Server-side logic handled via `route.ts` utilizing Next.js `NextResponse` for robust request processing.
* **DRY Layout Architecture:** The global footer and conditional routing (`usePathname`) eliminate duplicate back-navigation markup across views.