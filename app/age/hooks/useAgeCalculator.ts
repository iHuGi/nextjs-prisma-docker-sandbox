import { useState } from 'react';

export function useAgeCalculator() {
  // 1. State for user inputs, now including the mandatory email
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [momBirthDate, setMomBirthDate] = useState('');
  const [dadBirthDate, setDadBirthDate] = useState('');
  
  // 2. State for API feedback and error handling
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submitForm = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset feedback states before a new submission
    setResponseMessage('');
    setIsError(false);

    try {
      const res = await fetch('/api/age', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Include email in the payload to satisfy the new backend requirement
        body: JSON.stringify({ email, birthDate, momBirthDate, dadBirthDate }),
      });

      const data = await res.json();

      // Handle server responses (both expected errors from Zod and successful saves)
      if (!res.ok) {
        setIsError(true);
        setResponseMessage(data.error || 'Something went wrong.');
      } else {
        setIsError(false);
        setResponseMessage(data.message);
      }
    } catch (err) {
      // Handle network failures or unexpected crashes
      setIsError(true);
      setResponseMessage('Failed to connect to the server.');
    }
  };

  return { 
    email, setEmail,
    birthDate, setBirthDate,
    momBirthDate, setMomBirthDate,
    dadBirthDate, setDadBirthDate,
    responseMessage, isError, submitForm 
  };
}