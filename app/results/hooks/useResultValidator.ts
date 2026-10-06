'use client';

import { useState } from 'react';

export function useResultValidator() {
    const [email, setEmail] = useState('');
    const [resultData, setResultData] = useState<any>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const submitForm = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setResponseMessage('');
        setIsError(false);
        setResultData(null);

        try {
            const res = await fetch('api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                setIsError(true);
                setResponseMessage(data.error || 'An error occurred while processing the request.');
            } else if (!data.found) {
                setIsError(true);
                setResponseMessage('No record found for this email.');
            } else {
                setResultData(data.data);
                setResponseMessage('Data successfully retrieved via Stored Procedure!');
            }
        } catch (err) {
            setIsError(true);
            setResponseMessage('Critical communication failure with the server.');
        } finally {
            setLoading(false);
        }
    };

    return {
        email,
        setEmail,
        resultData,
        responseMessage,
        isError,
        loading,
        submitForm,
    };
}