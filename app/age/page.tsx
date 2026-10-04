'use client';

import { useState } from 'react';

export default function Age() {
  // State management for form input and UI feedback
  const [birthDate, setBirthDate] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default browser page reload
    setResponseMessage('');
    setIsError(false);

    // Execute API call to the age endpoint
    const res = await fetch('/api/age', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ birthDate }),
    });

    const data = await res.json();

    // Handle response state
    if (!res.ok) {
      setIsError(true);
      setResponseMessage(data.error);
    } else {
      setResponseMessage(data.message);
    }
  };

  return (
    <main
      style={{
        fontFamily: 'sans-serif',
        padding: '2rem',
        maxWidth: '400px',
        margin: '0 auto',
      }}
    >
      <h1>Age Calculator 📅</h1>

      {/* Form submission triggers handleSubmit */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          Enter your birth date:

          {/* Native HTML5 date picker */}
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
            }}
          />
        </label>

        {/* Submit button tied to the form */}
        <button
          type="submit"
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            cursor: 'pointer',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Calculate Age
        </button>
      </form>

      {/* Conditional rendering for API response feedback */}
      {responseMessage && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '6px',
            backgroundColor: isError ? '#ffe6e6' : '#e6ffe6',
            color: isError ? '#cc0000' : '#006600',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {responseMessage}
        </div>
      )}
    </main>
  );
}