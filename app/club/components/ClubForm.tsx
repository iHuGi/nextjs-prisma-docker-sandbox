'use client';

import { useClubValidator } from '../hooks/useClubValidator';
import styles from './ClubForm.module.css';

export default function ClubForm() {
  // Destructure state and handlers from the custom hook
  const { club, setClub, email, setEmail, responseMessage, isError, submitForm } = useClubValidator();

  return (
    <>
      <form onSubmit={submitForm} className={styles.formContainer}>
        
        {/* Email Input Field */}
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

        {/* Club Name Input Field */}
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

        {/* Form Submission Button */}
        <button type="submit" className={styles.submitBtn}>
          Validate Taste
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