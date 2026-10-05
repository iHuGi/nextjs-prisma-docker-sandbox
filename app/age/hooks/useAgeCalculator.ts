import { useState } from 'react';

export function useAgeCalculator() {
  const [birthDate, setBirthDate] = useState('');
  const [momBirthDate, setMomBirthDate] = useState('');
  const [dadBirthDate, setDadBirthDate] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submitForm = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResponseMessage('');
    setIsError(false);

    try {
      const res = await fetch('/api/age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, momBirthDate, dadBirthDate }),
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

  return { 
    birthDate, setBirthDate,
    momBirthDate, setMomBirthDate,
    dadBirthDate, setDadBirthDate,
    responseMessage, isError, submitForm 
  };
}