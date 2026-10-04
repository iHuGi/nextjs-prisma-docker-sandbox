'use client';

import { useClubValidator } from '../hooks/useClubValidator';
import styles from './ClubForm.module.css';

export default function ClubForm() {
  const { club, setClub, responseMessage, isError, submitForm } = useClubValidator();

  return (
    <>
      <form onSubmit={submitForm} className={styles.formContainer}>
        <label className={styles.inputGroup}>
          Enter the club's name:
          <input 
            type="text" 
            className={styles.inputField}
            value={club} 
            onChange={(e) => setClub(e.target.value)}
            required
            placeholder="e.g., Sporting"
          />
        </label>
        
        <button type="submit" className={styles.submitBtn}>
          Validate Taste
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