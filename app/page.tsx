import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      {/* Main dashboard header */}
      <h1>Welcome to the Next.js App</h1>
      <p style={{ marginBottom: '2rem' }}>Choose one of the tools below to test the App Router:</p>
      
      {/* Navigation container for sub-applications */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {/* Link to the Age Calculator route */}
        <Link href="/age" style={{ padding: '1rem', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
          Calculate Age
        </Link>
        
        {/* Link to the Club Validator route */}
        <Link href="/club" style={{ padding: '1rem', background: '#0066cc', color: '#fff', textDecoration: 'none', borderRadius: '6px' }}>
          Validate Club
        </Link>
      </div>
    </main>
  );
}