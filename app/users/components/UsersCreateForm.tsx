"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./UsersCreate.module.css";

/**
 * ============================================================================
 * UsersCreateForm Component
 * ============================================================================
 * Purpose: Provides an administrative interface to create or update User
 * profiles, including country selection and existing user auto-hydration.
 * ============================================================================
 */

interface Country {
  id: number;
  code: string;
  name: string;
}

interface UserRecord {
  id: number;
  email: string;
  identificationNumber: string;
  phoneNumber: string;
  countryId: number;
  country?: Country;
}

export default function UsersCreateForm() {
  // Master data collections fetched from backend endpoints
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  // Lookup input state for searching and auto-filling existing users
  const [userLookupInput, setUserLookupInput] = useState<string>("");

  // Controlled form input states for User upsert payload
  const [email, setEmail] = useState<string>("");
  const [identificationNumber, setIdentificationNumber] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Decoupled Country search text state vs resolved database Country ID
  const [countrySearchInput, setCountrySearchInput] =
    useState<string>("Portugal (PT)");
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
    null,
  );

  // UI feedback states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  /**
   * Fetch all registered users from /api/users to populate the lookup datalist
   * and the bottom overview table.
   */
  const fetchUsersList = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch registered users:", err);
    }
  };

  /**
   * Initial mount effect: load both existing users and available countries
   * in parallel. Defaults the selected country to Portugal (PT) if present.
   */
  useEffect(() => {
    async function loadInitialResources() {
      try {
        const [usersRes, countriesRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/admin/countries"),
        ]);

        const usersData = await usersRes.json();
        const countriesData = await countriesRes.json();

        if (usersData.success && Array.isArray(usersData.users)) {
          setUsers(usersData.users);
        }

        if (countriesData.success && Array.isArray(countriesData.countries)) {
          const loadedCountries: Country[] = countriesData.countries;
          setCountries(loadedCountries);

          if (loadedCountries.length > 0) {
            const defaultPt =
              loadedCountries.find((c) => c.code === "PT") ||
              loadedCountries[0];
            setSelectedCountryId(defaultPt.id);
            setCountrySearchInput(`${defaultPt.name} (${defaultPt.code})`);
          }
        }
      } catch (err) {
        console.error("Failed to initialize user management resources:", err);
      }
    }

    loadInitialResources();
  }, []);

  /**
   * Handler for the top User Lookup search bar.
   * When an administrator selects a matching user from the datalist, all form
   * fields (email, identificationNumber, phoneNumber, country) are hydrated.
   */
  const handleUserLookupChange = (inputValue: string) => {
    setUserLookupInput(inputValue);

    const matchedUser = users.find(
      (u) =>
        `${u.email} (ID: ${u.id})`.toLowerCase() ===
          inputValue.trim().toLowerCase() ||
        u.email.toLowerCase() === inputValue.trim().toLowerCase(),
    );

    if (matchedUser) {
      setEmail(matchedUser.email);
      setIdentificationNumber(matchedUser.identificationNumber);
      setPhoneNumber(matchedUser.phoneNumber);
      setSelectedCountryId(matchedUser.countryId);

      const matchedCountry = countries.find(
        (c) => c.id === matchedUser.countryId,
      );
      if (matchedCountry) {
        setCountrySearchInput(
          `${matchedCountry.name} (${matchedCountry.code})`,
        );
      }

      setFeedback({
        text: `Loaded existing profile for "${matchedUser.email}". Modify fields below to update.`,
        isError: false,
      });
    }
  };

  /**
   * Handler for the Country searchable input.
   * Allows free typing/deletion without corrupting state, updating the
   * selectedCountryId only when an exact match is identified.
   */
  const handleCountrySearchChange = (inputValue: string) => {
    setCountrySearchInput(inputValue);

    const exactMatch = countries.find(
      (c) =>
        `${c.name} (${c.code})`.toLowerCase() ===
          inputValue.trim().toLowerCase() ||
        c.code.toLowerCase() === inputValue.trim().toLowerCase() ||
        c.name.toLowerCase() === inputValue.trim().toLowerCase(),
    );

    if (exactMatch) {
      setSelectedCountryId(exactMatch.id);
    } else {
      setSelectedCountryId(null);
    }
  };

  /**
   * Form submission handler: validates input constraints and dispatches a
   * POST request to /api/users to create or update the user record.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedEmail = email.trim();
    const trimmedIdNumber = identificationNumber.trim();
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedEmail.includes("@")) {
      setFeedback({
        text: "Validation Error: Email must contain an @ symbol.",
        isError: true,
      });
      return;
    }

    if (!/^\d+$/.test(trimmedIdNumber)) {
      setFeedback({
        text: "Validation Error: Identification number must contain integer digits only.",
        isError: true,
      });
      return;
    }

    if (!/^\d+$/.test(trimmedPhone)) {
      setFeedback({
        text: "Validation Error: Phone number must contain integer digits only.",
        isError: true,
      });
      return;
    }

    if (!selectedCountryId) {
      setFeedback({
        text: "Validation Error: Please select a valid country from the list.",
        isError: true,
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          identificationNumber: trimmedIdNumber,
          phoneNumber: trimmedPhone,
          countryId: selectedCountryId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          text: `User profile "${data.user.email}" saved successfully!`,
          isError: false,
        });
        await fetchUsersList();
      } else {
        setFeedback({
          text: data.error || "Failed to save user profile.",
          isError: true,
        });
      }
    } catch (err) {
      setFeedback({
        text: "Network error while communicating with /api/users.",
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Users Management</h1>
        <p className={styles.subtitle}>
          Create new user profiles or select an existing user to update
          identification, phone, and country records.
        </p>
      </header>

      {/* 1. Existing User Lookup & Auto-Hydration Bar */}
      <div className={styles.card}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Search Existing Users (Select to auto-fill form fields):
          </label>
          <input
            type="text"
            list="existing-users-datalist"
            value={userLookupInput}
            onChange={(e) => handleUserLookupChange(e.target.value)}
            placeholder="Search by email or ID..."
            className={styles.input}
          />
          <datalist id="existing-users-datalist">
            {users.map((u) => (
              <option key={u.id} value={`${u.email} (ID: ${u.id})`} />
            ))}
          </datalist>
        </div>
      </div>

      {/* 2. Status & Validation Feedback Banner */}
      {feedback && (
        <div
          className={`${styles.messageBox} ${
            feedback.isError ? styles.messageError : styles.messageSuccess
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* 3. User Creation / Update Form */}
      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@domain.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Identification Number (Integer) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={identificationNumber}
              onChange={(e) => setIdentificationNumber(e.target.value)}
              placeholder="e.g. 12345678"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Phone Number (Integer) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 912345678"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Country *</label>
            <input
              type="text"
              list="users-country-datalist"
              value={countrySearchInput}
              onChange={(e) => handleCountrySearchChange(e.target.value)}
              placeholder="Search and select country..."
              className={styles.input}
              required
            />
            <datalist id="users-country-datalist">
              {countries.map((c) => (
                <option key={c.id} value={`${c.name} (${c.code})`} />
              ))}
            </datalist>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={styles.btnPrimary}
        >
          {submitting ? "Saving User Profile..." : "Create / Update User"}
        </button>
      </form>

      {/* 4. Registered Users Directory Table (Read-only overview) */}
      <div className={styles.card}>
        <h2 style={{ fontSize: "16px", marginTop: 0, marginBottom: "1rem" }}>
          Registered Users Directory ({users.length})
        </h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Identification Number</th>
                <th>Phone Number</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", color: "#888" }}
                  >
                    No users registered yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.identificationNumber}</td>
                    <td>{u.phoneNumber}</td>
                    <td>
                      {u.country
                        ? `${u.country.name} (${u.country.code})`
                        : `Country ID: ${u.countryId}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/" className={styles.backLink}>
        ← Back to Main Menu
      </Link>
    </div>
  );
}
