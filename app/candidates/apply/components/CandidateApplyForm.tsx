"use client";

import React, { useState, useEffect } from "react";
import styles from "./CandidateApply.module.css";

interface Country {
  id: number;
  code: string;
  name: string;
}

interface CandidateUser {
  id: number;
  email: string;
  countryId: number | null;
  country?: { code: string; name: string };
}

interface AnswerOption {
  id: number;
  label: string;
}

interface Question {
  id: number;
  label: string;
  answerType: string;
  displayAs: string;
  isRequired: boolean;
  preFilledText?: string | null;
  conditionJson?: { questionId: number; expectedValue: string } | null;
  answers: AnswerOption[];
}

interface Section {
  id: number;
  name: string;
  questions: Question[];
}

export default function CandidateApplyForm() {
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchInput, setUserSearchInput] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("PT");
  const [countrySearchInput, setCountrySearchInput] =
    useState<string>("Portugal (PT)");
  const [, setShowCountryDropdown] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [formResponses, setFormResponses] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load candidate users and available countries from the database on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [usersRes, countriesRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/countries"),
        ]);
        const usersData = await usersRes.json();
        const countriesData = await countriesRes.json();

        const loadedCountries: Country[] =
          countriesData.success && Array.isArray(countriesData.countries)
            ? countriesData.countries
            : [];
        setCountries(loadedCountries);

        if (usersData.success && Array.isArray(usersData.users)) {
          const allUsers: CandidateUser[] = usersData.users;
          setUsers(allUsers);

          if (allUsers.length > 0) {
            const savedUserId = Number(
              sessionStorage.getItem("candidate_selectedUserId"),
            );
            const targetUser =
              allUsers.find((u) => u.id === savedUserId) || allUsers[0];

            setSelectedUserId(targetUser.id);
            setUserSearchInput(`${targetUser.email} (ID: ${targetUser.id})`);

            const savedCountryCode = sessionStorage.getItem(
              "candidate_countryCode",
            );
            const initialCode =
              savedCountryCode ||
              targetUser.country?.code ||
              loadedCountries[0]?.code ||
              "PT";

            setCountryCode(initialCode);
            const matchedCountry = loadedCountries.find(
              (c) => c.code === initialCode,
            );
            setCountrySearchInput(
              matchedCountry
                ? `${matchedCountry.name} (${matchedCountry.code})`
                : initialCode,
            );
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch active sections and questions for the selected country code
  const fetchConfigForCountry = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/config?countryCode=${code}`);
      const data = await res.json();
      if (data.success && data.country) {
        setSections(data.country.sections || []);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error("Failed to load country configuration", err);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countryCode && countryCode.length === 2) {
      fetchConfigForCountry(countryCode);
    }
  }, [countryCode]);

  // Automatically hydrate existing candidate responses from UserMetadata (JSONB)
  useEffect(() => {
    async function loadCandidateSavedResponses() {
      if (!selectedUserId || sections.length === 0) return;

      try {
        const res = await fetch(`/api/admin/config?userId=${selectedUserId}`);
        const data = await res.json();

        const savedCustomData = data?.metadata?.customData;
        const savedAnswers =
          savedCustomData &&
          typeof savedCustomData === "object" &&
          savedCustomData.applicationResponses
            ? savedCustomData.applicationResponses
            : null;

        if (!savedAnswers) {
          setFormResponses({});
          return;
        }

        const hydratedResponses: Record<number, any> = {};
        sections.forEach((sec) => {
          sec.questions.forEach((q) => {
            if (savedAnswers[q.label] !== undefined) {
              hydratedResponses[q.id] = savedAnswers[q.label];
            } else if (savedAnswers[q.id] !== undefined) {
              hydratedResponses[q.id] = savedAnswers[q.id];
            }
          });
        });

        setFormResponses(hydratedResponses);
      } catch (err) {
        console.error("Failed to load candidate metadata responses", err);
      }
    }

    loadCandidateSavedResponses();
  }, [selectedUserId, sections]);

  const handleUserInputChange = (inputValue: string) => {
    setUserSearchInput(inputValue);

    const matchedUser = users.find(
      (u) =>
        `${u.email} (ID: ${u.id})`.toLowerCase() === inputValue.toLowerCase() ||
        u.email.toLowerCase() === inputValue.toLowerCase(),
    );

    if (matchedUser) {
      setSelectedUserId(matchedUser.id);
      sessionStorage.setItem(
        "candidate_selectedUserId",
        String(matchedUser.id),
      );
      setMessage(null);
      if (matchedUser.country) {
        const cCode = matchedUser.country.code;
        setCountryCode(cCode);
        sessionStorage.setItem("candidate_countryCode", cCode);
        const matchedCountry = countries.find((c) => c.code === cCode);
        setCountrySearchInput(
          matchedCountry
            ? `${matchedCountry.name} (${matchedCountry.code})`
            : cCode,
        );
      }
    }
  };

  const handleCountryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCountrySearchInput(val);
    setShowCountryDropdown(true);

    const exactMatch = countries.find(
      (c) =>
        c.code.toLowerCase() === val.trim().toLowerCase() ||
        c.name.toLowerCase() === val.trim().toLowerCase() ||
        `${c.name} (${c.code})`.toLowerCase() === val.trim().toLowerCase(),
    );
    if (exactMatch) {
      setCountryCode(exactMatch.code);
      sessionStorage.setItem("candidate_countryCode", exactMatch.code);
    }
  };

  const handleInputChange = (questionId: number, value: any) => {
    setFormResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMultiSelectToggle = (questionId: number, optionLabel: string) => {
    setFormResponses((prev) => {
      const current: string[] = Array.isArray(prev[questionId])
        ? prev[questionId]
        : [];
      const exists = current.includes(optionLabel);
      const updated = exists
        ? current.filter((item) => item !== optionLabel)
        : [...current, optionLabel];
      return {
        ...prev,
        [questionId]: updated,
      };
    });
  };

  const isQuestionVisible = (q: Question): boolean => {
    if (!q.conditionJson || !q.conditionJson.questionId) return true;
    const parentAnswer = formResponses[q.conditionJson.questionId];
    if (Array.isArray(parentAnswer)) {
      return parentAnswer.includes(q.conditionJson.expectedValue);
    }
    return parentAnswer === q.conditionJson.expectedValue;
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert("Please select or type a valid candidate user first.");
      return;
    }

    for (const sec of sections) {
      for (const q of sec.questions) {
        if (!isQuestionVisible(q) || !q.isRequired) continue;
        const val = formResponses[q.id];
        const isEmpty =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          alert(`Please answer the required question: "${q.label}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    setMessage(null);

    const formattedAnswers: Record<string, any> = {};
    sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (!isQuestionVisible(q)) return;

        const rawVal = formResponses[q.id];
        if (rawVal === undefined || rawVal === null || rawVal === "") return;

        const activeOptionLabels = new Set(q.answers.map((a) => a.label));

        if (q.answerType === "multi" && Array.isArray(rawVal)) {
          const sanitizedArray = rawVal.filter(
            (item) => typeof item === "string" && activeOptionLabels.has(item),
          );
          if (sanitizedArray.length > 0) {
            formattedAnswers[q.label] = sanitizedArray;
          }
        } else if (q.answerType === "single" || q.answerType === "bool") {
          if (typeof rawVal === "string" && activeOptionLabels.has(rawVal)) {
            formattedAnswers[q.label] = rawVal;
          }
        } else {
          formattedAnswers[q.label] = String(rawVal).trim();
        }
      });
    });

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_candidate",
          userId: selectedUserId,
          countryCode,
          answers: formattedAnswers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(
          "✅ Candidate application responses saved successfully into UserMetadata!",
        );
      } else {
        setMessage("❌ Error: " + JSON.stringify(data.error));
      }
    } catch (err) {
      setMessage("❌ Network error while saving application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Candidate Application Simulator</h1>
          <p className={styles.subtitle}>
            Test dynamic form rendering and JSONB storage into UserMetadata.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#a1a1a1" }}>
              Candidate:
            </span>
            <input
              type="text"
              list="users-list"
              value={userSearchInput}
              onChange={(e) => handleUserInputChange(e.target.value)}
              placeholder="Search candidate..."
              className={styles.input}
              style={{ width: "220px" }}
            />
            <datalist id="users-list">
              {users.map((u) => (
                <option key={u.id} value={`${u.email} (ID: ${u.id})`} />
              ))}
            </datalist>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#a1a1a1" }}>Country:</span>
            <input
              type="text"
              list="apply-countries-list"
              value={countrySearchInput}
              onChange={handleCountryInputChange}
              placeholder="Search country..."
              className={styles.input}
              style={{ width: "160px" }}
            />
            <datalist id="apply-countries-list">
              {countries.map((c) => (
                <option key={c.code} value={`${c.name} (${c.code})`} />
              ))}
            </datalist>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 500, margin: 0 }}>
            Application Form for Country: {countryCode}
          </h2>
          {loading && (
            <span style={{ fontSize: "12px", color: "#60a5fa" }}>
              Loading configuration...
            </span>
          )}
        </div>

        {message && <div className={styles.messageBox}>{message}</div>}

        {sections.length === 0 && !loading ? (
          <div className={styles.emptyState}>
            No configuration found for country {countryCode}. Configure sections
            in /admin/config first.
          </div>
        ) : (
          sections.map((sec) => {
            const visibleQuestions = sec.questions.filter(isQuestionVisible);
            if (visibleQuestions.length === 0) return null;

            return (
              <div key={sec.id} className={styles.card}>
                <h3 className={styles.sectionTitle}>{sec.name}</h3>

                {visibleQuestions.map((q) => (
                  <div key={q.id} className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {q.label}{" "}
                      {q.isRequired && (
                        <span className={styles.required}>*</span>
                      )}
                    </label>

                    {q.answerType === "text" ? (
                      <input
                        type="text"
                        value={formResponses[q.id] || ""}
                        placeholder={q.preFilledText || "Type your answer..."}
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        className={styles.input}
                      />
                    ) : q.answerType === "bool" ? (
                      <select
                        value={formResponses[q.id] || ""}
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        className={styles.select}
                      >
                        <option value="">Select Yes / No...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : q.answerType === "multi" ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          padding: "10px 12px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          borderRadius: "6px",
                        }}
                      >
                        {q.answers.map((ans) => {
                          const selectedList: string[] = Array.isArray(
                            formResponses[q.id],
                          )
                            ? formResponses[q.id]
                            : [];
                          const isChecked = selectedList.includes(ans.label);
                          return (
                            <label
                              key={ans.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                cursor: "pointer",
                                color: "#f4f4f5",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  handleMultiSelectToggle(q.id, ans.label)
                                }
                              />
                              {ans.label}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <select
                        value={formResponses[q.id] || ""}
                        onChange={(e) =>
                          handleInputChange(q.id, e.target.value)
                        }
                        className={styles.select}
                      >
                        <option value="">Select an option...</option>
                        {q.answers.map((ans) => (
                          <option key={ans.id} value={ans.label}>
                            {ans.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}

        {sections.length > 0 && (
          <button
            type="submit"
            disabled={submitting}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={{ width: "100%", padding: "12px", marginTop: "8px" }}
          >
            {submitting ? "Submitting..." : "Submit Application Responses"}
          </button>
        )}
      </form>
    </div>
  );
}
