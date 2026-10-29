import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        fontFamily: "var(--font-geist-sans), sans-serif",
        padding: "4rem 2rem",
        maxWidth: "900px",
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
            maxWidth: "500px",
            margin: "0 auto",
          }}
        >
          Select a module below to access administrative tools, applicant flows,
          and utility modules:
        </p>
      </div>

      {/* Grid container for balanced layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.25rem",
          width: "100%",
          maxWidth: "750px",
        }}
      >
        {/* Admin Configuration Engine */}
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

        {/* Candidate Apply Simulator */}
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

        {/* Calculate Age */}
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
              Utility tool test
            </div>
          </div>
        </Link>

        {/* Validate Club */}
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
              Business logic check
            </div>
          </div>
        </Link>

        {/* View Results */}
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
    </main>
  );
}
