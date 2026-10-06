import ResultForm from './components/ResultForm';

export default function ResultsPage() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Consolidated User Results 📊</h1>
      <ResultForm />
    </main>
  );
}