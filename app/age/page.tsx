import AgeForm from './components/AgeForm';

export default function Age() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Age Calculator 📅</h1>
      <AgeForm />
    </main>
  );
}