import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
      {/* Main dashboard header */}
      <h1>Welcome to the Next.js App</h1>
      <p style={{ marginBottom: '2rem' }}>Choose one of the tools below to test the App Router:</p>
      
      {/* Navigation container for sub-applications */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Link to the Age Calculator route */}
        <Link href="/age" style={{ padding: '1rem', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
          Calculate Age
        </Link>
        
        {/* Link to the Club Validator route */}
        <Link href="/club" style={{ padding: '1rem', background: '#0066cc', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
          Validate Club
        </Link>

        {/* Link to the Consolidated Results (Stored Procedure) route */}
        <Link href="/results" style={{ padding: '1rem', background: '#2e7d32', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
          View Results
        </Link>
      </div>
    </main>
  );
}