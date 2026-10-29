"use client";

import React, { useState, useEffect } from "react";
import styles from "./AdminConfig.module.css";

interface Country {
  id: number;
  code: string;
  name: string;
}

interface Answer {
  id: number;
  label: string;
  isPreFilled?: boolean;
  isArchived?: boolean;
}

interface Question {
  id: number;
  label: string;
  answerType: string;
  displayAs: string;
  isRequired: boolean;
  confirmAiValue: boolean;
  preFilledText?: string | null;
  sortOrder: number;
  conditionJson?: any;
  answers: Answer[];
  isArchived?: boolean;
}

interface Section {
  id: number;
  name: string;
  questions: Question[];
  isArchived?: boolean;
}

export default function AdminConfigForm() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("PT");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trash view toggle state
  const [showTrash, setShowTrash] = useState(false);

  // Section modal states
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionNameInput, setSectionNameInput] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);

  // Question modal states
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [questionLabelInput, setQuestionLabelInput] = useState("");
  const [questionTypeInput, setQuestionTypeInput] = useState("single");
  const [displayAsInput, setDisplayAsInput] = useState("list");
  const [questionRequiredInput, setQuestionRequiredInput] = useState(false);
  const [confirmAiInput, setConfirmAiInput] = useState(false);
  const [answersInput, setAnswersInput] = useState("Yes, No");

  // Condition (DAG) states
  const [isConditional, setIsConditional] = useState(false);
  const [conditionParentId, setConditionParentId] = useState<string>("");
  const [conditionExpectedValue, setConditionExpectedValue] = useState("");

  // --- 1. Fetch Countries from Database on Mount ---
  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch("/api/admin/countries");
        const data = await res.json();
        if (data.success && Array.isArray(data.countries)) {
          setCountries(data.countries);
        } else {
          setCountries([]);
        }
      } catch (err) {
        console.error("Failed to fetch countries from API", err);
        setCountries([]);
      }
    }
    loadCountries();
  }, []);

  // --- 2. Fetch Configuration from Database (GET with includeArchived=true) ---
  const fetchConfig = async (countryCode: string) => {
    if (!countryCode) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/admin/config?countryCode=${countryCode}&includeArchived=true`,
      );
      const data = await res.json();
      if (data.success && data.country) {
        setSections(data.country.sections || []);
      } else {
        setErrorMessage(data.error || "Failed to load configuration.");
        setSections([]);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Network error while loading configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCountry && selectedCountry.length === 2) {
      fetchConfig(selectedCountry);
    }
  }, [selectedCountry]);

  // --- 3. Save Section (POST: upsert_section) ---
  const handleSaveSection = async () => {
    if (!sectionNameInput.trim()) return;

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_section",
          countryCode: selectedCountry,
          name: sectionNameInput.trim(),
          id: editingSectionId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSectionModalOpen(false);
        fetchConfig(selectedCountry);
      } else {
        alert("Error saving section: " + JSON.stringify(data.error));
      }
    } catch (err) {
      alert("Network error while saving section.");
    }
  };

  // --- 4. Save Question (POST: upsert_question - Create or Edit) ---
  const handleSaveQuestion = async () => {
    if (!questionLabelInput.trim() || !activeSectionId) return;

    let parsedAnswers: {
      label: string;
      isPreFilled: boolean;
      isLocked: boolean;
      isArchived: boolean;
    }[] = [];

    if (questionTypeInput === "bool") {
      parsedAnswers = [
        { label: "Yes", isPreFilled: true, isLocked: true, isArchived: false },
        { label: "No", isPreFilled: false, isLocked: true, isArchived: false },
      ];
    } else if (questionTypeInput !== "text") {
      parsedAnswers = answersInput
        .split(",")
        .map((l, index) => ({
          label: l.trim(),
          isPreFilled: index === 0,
          isLocked: false,
          isArchived: false,
        }))
        .filter((a) => a.label.length > 0);
    }

    const conditionJson =
      isConditional && conditionParentId
        ? {
            questionId: Number(conditionParentId),
            expectedValue: conditionExpectedValue,
          }
        : null;

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_question",
          id: editingQuestionId || undefined,
          sectionId: activeSectionId,
          label: questionLabelInput.trim(),
          answerType: questionTypeInput,
          displayAs: displayAsInput,
          isRequired: questionRequiredInput,
          confirmAiValue: confirmAiInput,
          preFilledText:
            questionTypeInput === "text" ? answersInput.trim() || null : null,
          conditionJson,
          updatedBy: "Admin User",
          answers: parsedAnswers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsQuestionModalOpen(false);
        fetchConfig(selectedCountry);
      } else {
        alert("Error saving question: " + JSON.stringify(data.error));
      }
    } catch (err) {
      alert("Network error while saving question.");
    }
  };

  // --- 5. Reorder Questions ---
  const handleMoveQuestion = async (
    sectionId: number,
    questions: Question[],
    index: number,
    direction: "up" | "down",
  ) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const orderedQuestionIds = updated.map((q) => q.id);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder_questions",
          sectionId,
          orderedQuestionIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchConfig(selectedCountry);
      } else {
        alert("Reorder error: " + JSON.stringify(data.error));
      }
    } catch (err) {
      alert("Network error while reordering questions.");
    }
  };

  // --- 6. Archive / Restore Section (Soft Delete) ---
  const handleToggleArchiveSection = async (sec: Section, archive: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${archive ? "archive" : "restore"} section "${sec.name}"?`,
      )
    )
      return;
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive_section",
          sectionId: sec.id,
          isArchived: archive,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Error: " + JSON.stringify(data.error));
      }
      fetchConfig(selectedCountry);
    } catch (err) {
      alert("Error updating section archive status.");
    }
  };

  // --- 7. Archive / Restore Question (Soft Delete) ---
  const handleToggleArchiveQuestion = async (
    sectionId: number,
    q: Question,
    archive: boolean,
  ) => {
    if (
      !confirm(
        `Are you sure you want to ${archive ? "archive" : "restore"} question "${q.label}"?`,
      )
    )
      return;
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive_question",
          questionId: q.id,
          isArchived: archive,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Error: " + JSON.stringify(data.error));
      }
      fetchConfig(selectedCountry);
    } catch (err) {
      alert("Network error while updating question archive status.");
    }
  };

  // --- Modal Open Handlers ---
  const handleOpenAddSection = () => {
    setEditingSectionId(null);
    setSectionNameInput("");
    setIsSectionModalOpen(true);
  };

  const handleOpenRenameSection = (sec: Section) => {
    setEditingSectionId(sec.id);
    setSectionNameInput(sec.name);
    setIsSectionModalOpen(true);
  };

  const handleOpenAddQuestion = (sectionId: number) => {
    setActiveSectionId(sectionId);
    setEditingQuestionId(null);
    setQuestionLabelInput("");
    setQuestionTypeInput("single");
    setDisplayAsInput("list");
    setQuestionRequiredInput(false);
    setConfirmAiInput(false);
    setAnswersInput("Option 1, Option 2");
    setIsConditional(false);
    setConditionParentId("");
    setConditionExpectedValue("");
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (sectionId: number, q: Question) => {
    setActiveSectionId(sectionId);
    setEditingQuestionId(q.id);
    setQuestionLabelInput(q.label);
    const qType = q.answerType || "single";
    setQuestionTypeInput(qType);
    setDisplayAsInput(q.displayAs || "list");
    setQuestionRequiredInput(q.isRequired);
    setConfirmAiInput(q.confirmAiValue);

    if (qType === "bool") {
      setAnswersInput("Yes, No");
    } else if (qType === "text") {
      setAnswersInput(q.preFilledText || "");
    } else {
      setAnswersInput(q.answers.map((a) => a.label).join(", "));
    }

    if (q.conditionJson && q.conditionJson.questionId) {
      setIsConditional(true);
      setConditionParentId(String(q.conditionJson.questionId));
      setConditionExpectedValue(q.conditionJson.expectedValue || "");
    } else {
      setIsConditional(false);
      setConditionParentId("");
      setConditionExpectedValue("");
    }

    setIsQuestionModalOpen(true);
  };

  const handleQuestionTypeChange = (newType: string) => {
    setQuestionTypeInput(newType);
    if (newType === "bool") {
      setAnswersInput("Yes, No");
    } else if (newType === "text") {
      setAnswersInput("");
    } else if (answersInput === "Yes, No" || answersInput === "") {
      setAnswersInput("Option 1, Option 2");
    }
  };

  const currentSection = sections.find((s) => s.id === activeSectionId);
  const availableParentQuestions = currentSection
    ? currentSection.questions.filter(
        (q) =>
          q.id !== editingQuestionId &&
          !q.isArchived &&
          q.answerType !== "text",
      )
    : [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Recruitment Configuration Engine</h1>
          <p className={styles.subtitle}>
            Manage normalized 3NF sections, conditional visibility DAGs, and
            JSONB rules.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className={styles.btn}
            onClick={() => setShowTrash(!showTrash)}
            style={{
              borderColor: showTrash ? "#60a5fa" : "rgba(255,255,255,0.2)",
            }}
          >
            {showTrash
              ? "📂 View Active Configuration"
              : "🗑️ View Trash / Archive"}
          </button>
          <div
            className={styles.countrySelector}
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
          >
            <span style={{ fontSize: "13px", color: "#a1a1a1" }}>Country:</span>
            <input
              type="text"
              list="countries-list"
              value={
                countries.find((c) => c.code === selectedCountry)
                  ? `${countries.find((c) => c.code === selectedCountry)?.name} (${selectedCountry})`
                  : selectedCountry
              }
              onChange={(e) => {
                const val = e.target.value;
                const matched = countries.find(
                  (c) =>
                    `${c.name} (${c.code})`.toLowerCase() ===
                      val.toLowerCase() ||
                    c.code.toLowerCase() === val.toLowerCase() ||
                    c.name.toLowerCase() === val.toLowerCase(),
                );
                if (matched) {
                  setSelectedCountry(matched.code);
                } else if (val.trim().length <= 5) {
                  setSelectedCountry(val.toUpperCase());
                }
              }}
              placeholder="Search country..."
              style={{ ...selectDarkStyle, width: "180px" }}
            />
            <datalist id="countries-list">
              {countries.map((c) => (
                <option key={c.code} value={`${c.name} (${c.code})`} />
              ))}
            </datalist>
          </div>
        </div>
      </header>

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0 }}>
            {showTrash
              ? `Archived Items (Trash) - ${selectedCountry}`
              : `Additional Info Configurations (${selectedCountry})`}
          </h2>
          {loading && (
            <span style={{ fontSize: "12px", color: "#60a5fa" }}>
              Loading database...
            </span>
          )}
        </div>

        {errorMessage && (
          <div
            style={{ color: "#f87171", marginBottom: "16px", fontSize: "13px" }}
          >
            {errorMessage}
          </div>
        )}

        {!loading && sections.length === 0 ? (
          <div className={styles.emptyState}>
            No sections found for this country.
          </div>
        ) : (
          sections.map((sec) => {
            const displayedQuestions = sec.questions.filter((q) =>
              showTrash
                ? sec.isArchived || q.isArchived
                : !sec.isArchived && !q.isArchived,
            );
            const isSecMatchedTrashFilter = showTrash
              ? sec.isArchived || displayedQuestions.length > 0
              : !sec.isArchived;

            if (!isSecMatchedTrashFilter) return null;

            return (
              <div
                key={sec.id}
                className={styles.card}
                style={{ opacity: sec.isArchived ? 0.65 : 1 }}
              >
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    {sec.name}{" "}
                    {sec.isArchived && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#f87171",
                          marginLeft: "6px",
                        }}
                      >
                        [Archived Section]
                      </span>
                    )}{" "}
                    <small style={{ color: "#a1a1a1", fontWeight: 400 }}>
                      ({displayedQuestions.length} questions)
                    </small>
                  </h3>
                  <div className={styles.actions}>
                    {!sec.isArchived && !showTrash ? (
                      <>
                        <button
                          className={styles.btn}
                          onClick={() => handleOpenRenameSection(sec)}
                        >
                          Rename
                        </button>
                        <button
                          className={styles.btn}
                          style={{
                            color: "#f87171",
                            borderColor: "rgba(248, 113, 113, 0.3)",
                          }}
                          onClick={() => handleToggleArchiveSection(sec, true)}
                        >
                          Archive Section
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          onClick={() => handleOpenAddQuestion(sec.id)}
                        >
                          + Add Question
                        </button>
                      </>
                    ) : sec.isArchived ? (
                      <button
                        className={styles.btn}
                        style={{
                          color: "#34d399",
                          borderColor: "rgba(52, 211, 153, 0.3)",
                        }}
                        onClick={() => handleToggleArchiveSection(sec, false)}
                      >
                        Restore Section
                      </button>
                    ) : null}
                  </div>
                </div>

                {displayedQuestions.length === 0 ? (
                  <div className={styles.emptyState}>No items here.</div>
                ) : (
                  displayedQuestions.map((q, index) => (
                    <div key={q.id} className={styles.questionRow}>
                      <div>
                        <div className={styles.questionText}>
                          {q.label}{" "}
                          {q.conditionJson && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#60a5fa",
                                background: "rgba(96,165,250,0.1)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginLeft: "6px",
                              }}
                            >
                              Conditional
                            </span>
                          )}
                        </div>
                        <div className={styles.questionMeta}>
                          Type: {q.answerType} | Display: {q.displayAs} |{" "}
                          {q.answerType === "bool"
                            ? "Answers: Yes, No"
                            : q.answerType === "text"
                              ? "Free Text"
                              : `Answers: ${q.answers.map((a) => a.label).join(", ")}`}{" "}
                          | {q.isRequired ? "Required" : "Optional"}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        {!showTrash && !q.isArchived ? (
                          <>
                            <button
                              className={styles.btnLink}
                              disabled={index === 0}
                              onClick={() =>
                                handleMoveQuestion(
                                  sec.id,
                                  displayedQuestions,
                                  index,
                                  "up",
                                )
                              }
                              style={{ opacity: index === 0 ? 0.3 : 1 }}
                            >
                              ▲ Up
                            </button>
                            <button
                              className={styles.btnLink}
                              disabled={index === displayedQuestions.length - 1}
                              onClick={() =>
                                handleMoveQuestion(
                                  sec.id,
                                  displayedQuestions,
                                  index,
                                  "down",
                                )
                              }
                              style={{
                                opacity:
                                  index === displayedQuestions.length - 1
                                    ? 0.3
                                    : 1,
                              }}
                            >
                              ▼ Down
                            </button>
                            <button
                              className={styles.btnLink}
                              onClick={() => handleOpenEditQuestion(sec.id, q)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.btnLink}
                              style={{ color: "#f87171" }}
                              onClick={() =>
                                handleToggleArchiveQuestion(sec.id, q, true)
                              }
                            >
                              Archive
                            </button>
                          </>
                        ) : q.isArchived ? (
                          <button
                            className={styles.btnLink}
                            style={{ color: "#34d399" }}
                            onClick={() =>
                              handleToggleArchiveQuestion(sec.id, q, false)
                            }
                          >
                            Restore Question
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })
        )}

        {!showTrash && (
          <button
            className={styles.addSectionBtn}
            onClick={handleOpenAddSection}
          >
            + Add Section
          </button>
        )}
      </section>

      {/* --- SECTION MODAL --- */}
      {isSectionModalOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => setIsSectionModalOpen(false)}
        >
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              {editingSectionId ? "Rename Section" : "Add Section"}
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: "#a1a1a1",
                }}
              >
                Section Name *
              </label>
              <input
                type="text"
                value={sectionNameInput}
                onChange={(e) => setSectionNameInput(e.target.value)}
                placeholder="Ex: General Information"
                style={inputStyle}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveSection()}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                className={styles.btn}
                onClick={() => setIsSectionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSaveSection}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- QUESTION MODAL (Create & Edit + DAG Condition) --- */}
      {isQuestionModalOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => setIsQuestionModalOpen(false)}
        >
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              {editingQuestionId ? "Edit Question" : "Add Question"}
            </h3>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: "#a1a1a1",
                }}
              >
                Question Label *
              </label>
              <input
                type="text"
                value={questionLabelInput}
                onChange={(e) => setQuestionLabelInput(e.target.value)}
                placeholder="Ex: Preferred programming language"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  marginBottom: "6px",
                  color: "#a1a1a1",
                }}
              >
                Answer Type
              </label>
              <select
                value={questionTypeInput}
                onChange={(e) => handleQuestionTypeChange(e.target.value)}
                style={selectDarkStyle}
              >
                <option value="single">Single choice</option>
                <option value="multi">Multi-select</option>
                <option value="bool">Yes/No</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
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
                  checked={questionRequiredInput}
                  onChange={(e) => setQuestionRequiredInput(e.target.checked)}
                />
                Required question (Candidate must answer)
              </label>
            </div>

            {questionTypeInput === "bool" ? (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    marginBottom: "6px",
                    color: "#a1a1a1",
                  }}
                >
                  Answers (Locked for Yes/No)
                </label>
                <input
                  type="text"
                  value="Yes, No"
                  disabled
                  style={{
                    ...inputStyle,
                    opacity: 0.5,
                    cursor: "not-allowed",
                  }}
                />
              </div>
            ) : questionTypeInput === "text" ? (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    marginBottom: "6px",
                    color: "#a1a1a1",
                  }}
                >
                  Placeholder Text (Optional)
                </label>
                <input
                  type="text"
                  value={answersInput}
                  onChange={(e) => setAnswersInput(e.target.value)}
                  placeholder="Ex: Type your answer here..."
                  style={inputStyle}
                />
              </div>
            ) : (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    marginBottom: "6px",
                    color: "#a1a1a1",
                  }}
                >
                  Answers (separated by comma) *
                </label>
                <input
                  type="text"
                  value={answersInput}
                  onChange={(e) => setAnswersInput(e.target.value)}
                  placeholder="C++, Rust, C#, Python"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Conditional Visibility (DAG) Config */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: "12px",
                marginTop: "12px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isConditional}
                  onChange={(e) => setIsConditional(e.target.checked)}
                />
                Show only under condition (Only when...)
              </label>

              {isConditional && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    paddingLeft: "20px",
                    marginTop: "8px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        marginBottom: "4px",
                        color: "#a1a1a1",
                      }}
                    >
                      Depends on Question:
                    </label>
                    <select
                      value={conditionParentId}
                      onChange={(e) => setConditionParentId(e.target.value)}
                      style={selectDarkStyle}
                    >
                      <option value="">Select parent question...</option>
                      {availableParentQuestions.map((pq) => (
                        <option key={pq.id} value={pq.id}>
                          {pq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        marginBottom: "4px",
                        color: "#a1a1a1",
                      }}
                    >
                      Expected Answer Value:
                    </label>
                    <input
                      type="text"
                      value={conditionExpectedValue}
                      onChange={(e) =>
                        setConditionExpectedValue(e.target.value)
                      }
                      placeholder="Ex: Yes"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <button
                className={styles.btn}
                onClick={() => setIsQuestionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSaveQuestion}
              >
                {editingQuestionId ? "Update Question" : "Save Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectDarkStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: "#18181b",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "8px",
  padding: "24px",
  width: "100%",
  maxWidth: "480px",
  color: "#f4f4f5",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
};
