'use client';

import { useAgeCalculator } from '../hooks/useAgeCalculator';
import styles from './AgeForm.module.css';

export default function AgeForm() {
  const { 
    birthDate, setBirthDate, 
    momBirthDate, setMomBirthDate,
    dadBirthDate, setDadBirthDate,
    responseMessage, isError, submitForm } = useAgeCalculator();

  return (
    <>
      <form onSubmit={submitForm} className={styles.formContainer}>
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
        
        <button type="submit" className={styles.submitBtn}>
          Calculate Age
        </button>
      </form>

      {responseMessage && (
        <div className={`${styles.feedback} ${isError ? styles.error : styles.success}`}>
          {responseMessage}
        </div>
      )}
    </>
  );
}