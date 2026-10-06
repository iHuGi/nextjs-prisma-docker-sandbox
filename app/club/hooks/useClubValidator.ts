import { useState } from 'react';

export function useClubValidator() {
  const [email, setEmail] = useState('');
  const [club, setClub] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submitForm = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponseMessage('');
    setIsError(false);

    try {
      const res = await fetch('/api/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setResponseMessage(data.error || 'Something went wrong.');
      } else {
        setIsError(false);
        setResponseMessage(data.message);
      }
    } catch (err) {
      setIsError(true);
      setResponseMessage('Failed to connect to the server.');
    }
  };

  return { club, setClub, email, setEmail, responseMessage, isError, submitForm };
}