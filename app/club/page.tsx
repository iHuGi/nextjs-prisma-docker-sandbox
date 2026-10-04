import ClubForm from './components/ClubForm';

export default function Club() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>What's your club? ⚽</h1>
      <ClubForm />
    </main>
  );
}