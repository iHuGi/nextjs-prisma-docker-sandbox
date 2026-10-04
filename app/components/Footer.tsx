'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  // Retrieve the current route path
  const pathname = usePathname();

  return (
    <footer style={{ marginTop: 'auto', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid #333' }}>
      {/* Conditionally render the centralized back button if not on the root path */}
      {pathname !== '/' && (
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}>
            ← Back to Menu
          </Link>
        </div>
      )}
      
      {/* Global developer signature */}
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#888', fontWeight: '500' }}>
        Developer: Hugo Azevedo
      </p>
    </footer>
  );
}