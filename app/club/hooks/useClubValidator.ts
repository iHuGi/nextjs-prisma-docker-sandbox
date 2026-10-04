import { useState } from 'react';

export function useClubValidator() {
  const [club, setClub] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submitForm = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponseMessage('');
    setIsError(false);

    const res = await fetch('/api/club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsError(true);
      setResponseMessage(data.error);
    } else {
      setIsError(false);
      setResponseMessage(data.message);
    }
  };

  return { club, setClub, responseMessage, isError, submitForm };
}