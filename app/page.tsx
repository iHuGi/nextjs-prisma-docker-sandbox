import Link from "next/link";

/**
 * ============================================================================
 * Home Page (Main Navigation Dashboard)
 * ============================================================================
 * Purpose: Provides a structured two-row dashboard layout:
 * - Row 1: Core User Management & Dependent Validation Flows (Users, Age, Club)
 * - Row 2: Dynamic Configuration Engine & Reporting (Admin, Apply, Results)
 * ============================================================================
 */
export default function Home() {
  return (
    <main
      style={{
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "4rem 2rem",
        maxWidth: "960px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 600,
            marginBottom: "10px",
            letterSpacing: "-0.025em",
          }}
        >
          Next.js Recruitment & Configuration Engine
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#a1a1aa",
            maxWidth: "540px",
            margin: "0 auto",
          }}
        >
          Select a module below to manage master user profiles, execute domain
          validations, or configure dynamic country application rules:
        </p>
      </div>

      {/* Main Dashboard Container: 2 Distinct 3-Column Rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          width: "100%",
          maxWidth: "860px",
        }}
      >
        {/* ROW 1: MASTER USER MANAGEMENT & CORE VALIDATION MODULES */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          {/* 1. Users Management (Primary Entry Point) */}
          <Link
            href="/users"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>👤</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Users Management
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Create & update master user profiles
              </div>
            </div>
          </Link>

          {/* 2. Calculate Age */}
          <Link
            href="/age"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>🎂</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Calculate Age
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Biological age validation
              </div>
            </div>
          </Link>

          {/* 3. Validate Club */}
          <Link
            href="/club"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>⚽</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Validate Club
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Business logic affiliation check
              </div>
            </div>
          </Link>
        </div>

        {/* ROW 2: DYNAMIC ENGINE, CANDIDATE APPLICATION & REPORTING */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          {/* 4. Admin Configuration Engine */}
          <Link
            href="/admin/config"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>⚙️</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Admin Config
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Manage country forms & DAG rules
              </div>
            </div>
          </Link>

          {/* 5. Candidate Apply Simulator */}
          <Link
            href="/candidates/apply"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>📝</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                Candidate Apply Form
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Simulate candidate submissions
              </div>
            </div>
          </Link>

          {/* 6. View Results */}
          <Link
            href="/results"
            style={{
              padding: "1.25rem",
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "12px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "20px" }}>📊</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                View Results
              </div>
              <div
                style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "2px" }}
              >
                Stored procedure reporting
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
