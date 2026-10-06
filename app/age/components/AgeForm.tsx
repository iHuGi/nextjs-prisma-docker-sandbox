'use client';

import { useAgeCalculator } from '../hooks/useAgeCalculator';
import styles from './AgeForm.module.css';

export default function AgeForm() {
  // Destructure all required states and handlers from the custom hook
  const {
    email, setEmail,
    birthDate, setBirthDate, 
    momBirthDate, setMomBirthDate,
    dadBirthDate, setDadBirthDate,
    responseMessage, isError, submitForm 
  } = useAgeCalculator();

  return (
    <>
      <form onSubmit={submitForm} className={styles.formContainer}>
        
        {/* Email Input Field (Required for database upsert) */}
        <label className={styles.inputGroup}>
          Enter your email:
          <input
            type="email"
            className={styles.inputField}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g., john.doe@example.com"
          />
        </label>

        {/* User Birth Date Field */}
        <label className={styles.inputGroup}>
          Enter your birth date:
          <input
            type="date"
            className={styles.inputField}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>

        {/* Mother's Birth Date Field (Optional) */}
        <label className={styles.inputGroup}>
          Enter your mother's birth date:
          <input
            type="date"
            className={styles.inputField}
            value={momBirthDate}
            onChange={(e) => setMomBirthDate(e.target.value)}
            // required
          />
        </label>

        {/* Father's Birth Date Field (Optional) */}
        <label className={styles.inputGroup}>
          Enter your father's birth date:
          <input
            type="date"
            className={styles.inputField}
            value={dadBirthDate}
            onChange={(e) => setDadBirthDate(e.target.value)}
            // required
          />
        </label>
        
        {/* Form Submission Button */}
        <button type="submit" className={styles.submitBtn}>
          Calculate Age
        </button>
      </form>

      {/* Conditional rendering for API response feedback */}
      {responseMessage && (
        <div className={`${styles.feedback} ${isError ? styles.error : styles.success}`}>
          {responseMessage}
        </div>
      )}
    </>
  );
}