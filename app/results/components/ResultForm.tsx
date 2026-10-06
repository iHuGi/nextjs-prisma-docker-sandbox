'use client';

import { useResultValidator } from '../hooks/useResultValidator';
import styles from './ResultForm.module.css';

export default function ResultForm() {
    const { 
        email,
        setEmail,
        resultData,
        responseMessage,
        isError,
        loading,
        submitForm
    } = useResultValidator();

    return (
        <div className={styles.wrapper}>
            <form onSubmit={submitForm} className={styles.formContainer}>
                
                {/* Email Input Field */}
                <label className={styles.inputGroup}>
                    Enter the email to query:
                    <input
                        type="email" 
                        className={styles.inputField}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="e.g., hugo@email.com"
                    />
                </label>

                {/* Form Submission Button */}
                <button type="submit" className={styles.submitBtn} disabled={loading}>
                    {loading ? 'Querying engine...' : 'Execute Query'}
                </button>
            </form>

            {/* Conditional rendering for API response feedback */}
            {responseMessage && (
                <div className={`${styles.feedback} ${isError ? styles.error : styles.success}`}>
                    {responseMessage}
                </div>
            )}

            {/* Results Grid / JSON Viewer */}
            {resultData && (
                <div className={styles.resultContainer}>
                    <h3 className={styles.resultTitle}>Consolidated Record</h3>
                    <pre className={styles.jsonBox}>
                        {JSON.stringify(resultData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}