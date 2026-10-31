import Link from "next/link";
import styles from "./page.module.css";

/**
 * ============================================================================
 * Home Page (Main Navigation Dashboard)
 * ============================================================================
 * Purpose: Provides a structured three-row dashboard layout using scoped CSS:
 * - Row 1: Core User Management & Dependent Validation Flows (Users, Age, Club)
 * - Row 2: Dynamic Configuration Engine & Reporting (Admin, Apply, Results)
 * - Row 3: Relational Email Engine (Outbound SMTP Dispatch & Inbound IMAP Hub)
 * ============================================================================
 */
export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Next.js Recruitment & Configuration Engine
        </h1>
        <p className={styles.subtitle}>
          Select a module below to manage master user profiles, execute domain
          validations, configure dynamic country application rules, or manage
          relational email threads:
        </p>
      </div>

      {/* Main Dashboard Container: 3 Distinct Rows */}
      <div className={styles.dashboardContainer}>
        {/* ROW 1: MASTER USER MANAGEMENT & CORE VALIDATION MODULES */}
        <div className={styles.rowGrid}>
          {/* 1. Users Management (Primary Entry Point) */}
          <Link
            href="/users"
            className={`${styles.card} ${styles.cardPrimary}`}
          >
            <span className={styles.cardIcon}>👤</span>
            <div>
              <div className={styles.cardTitle}>Users Management</div>
              <div className={styles.cardDescription}>
                Create & update master user profiles
              </div>
            </div>
          </Link>

          {/* 2. Calculate Age */}
          <Link href="/age" className={styles.card}>
            <span className={styles.cardIcon}>🎂</span>
            <div>
              <div className={styles.cardTitle}>Calculate Age</div>
              <div className={styles.cardDescription}>
                Biological age validation
              </div>
            </div>
          </Link>

          {/* 3. Validate Club */}
          <Link href="/club" className={styles.card}>
            <span className={styles.cardIcon}>⚽</span>
            <div>
              <div className={styles.cardTitle}>Validate Club</div>
              <div className={styles.cardDescription}>
                Business logic affiliation check
              </div>
            </div>
          </Link>
        </div>

        {/* ROW 2: DYNAMIC ENGINE, CANDIDATE APPLICATION & REPORTING */}
        <div className={styles.rowGrid}>
          {/* 4. Admin Configuration Engine */}
          <Link href="/admin/config" className={styles.card}>
            <span className={styles.cardIcon}>⚙️</span>
            <div>
              <div className={styles.cardTitle}>Admin Config</div>
              <div className={styles.cardDescription}>
                Manage country forms & DAG rules
              </div>
            </div>
          </Link>

          {/* 5. Candidate Apply Simulator */}
          <Link href="/candidates/apply" className={styles.card}>
            <span className={styles.cardIcon}>📝</span>
            <div>
              <div className={styles.cardTitle}>Candidate Apply Form</div>
              <div className={styles.cardDescription}>
                Simulate candidate submissions
              </div>
            </div>
          </Link>

          {/* 6. View Results */}
          <Link href="/results" className={styles.card}>
            <span className={styles.cardIcon}>📊</span>
            <div>
              <div className={styles.cardTitle}>View Results</div>
              <div className={styles.cardDescription}>
                Stored procedure reporting
              </div>
            </div>
          </Link>
        </div>

        {/* ROW 3: RELATIONAL EMAIL ENGINE (SMTP & IMAP) */}
        <div className={styles.rowGrid}>
          {/* 7. Send Email (SMTP) */}
          <Link href="/emails/send" className={styles.card}>
            <span className={styles.cardIcon}>✉️</span>
            <div>
              <div className={styles.cardTitle}>Send Email (SMTP)</div>
              <div className={styles.cardDescription}>
                Dispatch & link outbound emails
              </div>
            </div>
          </Link>

          {/* 8. Email Inbox (IMAP) */}
          <Link href="/emails/inbox" className={styles.card}>
            <span className={styles.cardIcon}>📥</span>
            <div>
              <div className={styles.cardTitle}>Email Inbox (IMAP)</div>
              <div className={styles.cardDescription}>
                Sync replies & toggle Read/Unread
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
