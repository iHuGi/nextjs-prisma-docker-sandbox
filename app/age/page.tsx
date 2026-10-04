import AgeForm from './components/AgeForm';

// Repara que já não tem 'use client'! O Next.js vai renderizar isto no servidor.
export default function Age() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Age Calculator 📅</h1>
      <AgeForm />
    </main>
  );
}