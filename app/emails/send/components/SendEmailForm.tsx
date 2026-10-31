"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  ReceivedEmailDto,
  SentEmailResponseDto,
} from "../../../lib/dtos/email.dto";
import styles from "./SendEmail.module.css";

interface RegisteredUserOption {
  id: number;
  email: string;
  country?: { code: string; name: string } | null;
}

export default function SendEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const replyToParam = searchParams.get("replyToReceivedId");

  const [users, setUsers] = useState<RegisteredUserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchInput, setUserSearchInput] = useState<string>("");

  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [replyTarget, setReplyTarget] = useState<ReceivedEmailDto | null>(null);

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 1. Load registered users and optional ReceivedEmail reply context on mount
  useEffect(() => {
    async function initializeComposer() {
      setLoadingInitial(true);
      try {
        const usersRes = await fetch("/api/users");
        const usersData = await usersRes.json();

        const loadedUsers: RegisteredUserOption[] =
          usersData.success && Array.isArray(usersData.users)
            ? usersData.users
            : [];
        setUsers(loadedUsers);

        // Check if composing a reply to a specific ReceivedEmail record
        if (replyToParam) {
          const parsedReplyId = parseInt(replyToParam, 10);
          if (!Number.isNaN(parsedReplyId) && parsedReplyId > 0) {
            const replyRes = await fetch(
              `/api/emails/inbox?receivedId=${parsedReplyId}`,
            );
            const replyData = await replyRes.json();

            if (replyData.success && replyData.receivedEmail) {
              const targetEmail: ReceivedEmailDto = replyData.receivedEmail;
              setReplyTarget(targetEmail);
              setSelectedUserId(targetEmail.userId);
              setUserSearchInput(
                `${targetEmail.user.email} (ID: ${targetEmail.userId})`,
              );

              const cleanOriginalSubject = targetEmail.subject.trim();
              const prefilledSubject = /^re:/i.test(cleanOriginalSubject)
                ? cleanOriginalSubject
                : `Re: ${cleanOriginalSubject}`;
              setSubject(prefilledSubject);
              return;
            }
          }
        }

        // Default selection when not replying to a specific email
        if (loadedUsers.length > 0) {
          const firstUser = loadedUsers[0];
          setSelectedUserId(firstUser.id);
          setUserSearchInput(`${firstUser.email} (ID: ${firstUser.id})`);
        }
      } catch (err) {
        console.error("Failed to initialize email composer:", err);
        setFeedback({
          type: "error",
          text: "Failed to load registered users from the database.",
        });
      } finally {
        setLoadingInitial(false);
      }
    }

    initializeComposer();
  }, [replyToParam]);

  // 2. Match user input from datalist
  const handleUserSearchChange = (value: string) => {
    setUserSearchInput(value);
    const trimmed = value.trim().toLowerCase();

    const matched = users.find(
      (u) =>
        `${u.email} (ID: ${u.id})`.toLowerCase() === trimmed ||
        u.email.toLowerCase() === trimmed ||
        String(u.id) === trimmed,
    );

    if (matched) {
      setSelectedUserId(matched.id);
    } else {
      setSelectedUserId(null);
    }
  };

  // 3. Clear reply linkage to compose a standalone outbound email
  const handleClearReplyContext = () => {
    setReplyTarget(null);
    setSubject("");
    router.replace("/emails/send");
  };

  // 4. Submit outbound email via POST /api/emails/send
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedUserId) {
      setFeedback({
        type: "error",
        text: "Please select a valid registered user from the list.",
      });
      return;
    }

    if (!subject.trim()) {
      setFeedback({
        type: "error",
        text: "Email subject is required.",
      });
      return;
    }

    if (!body.trim()) {
      setFeedback({
        type: "error",
        text: "Email body cannot be empty.",
      });
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          subject: subject.trim(),
          body: body.trim(),
          receivedEmailId: replyTarget ? replyTarget.id : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          text: data.error || "Failed to send email.",
        });
        return;
      }

      const sentDto: SentEmailResponseDto = data.sentEmail;
      setBody("");

      setFeedback({
        type: "success",
        text: sentDto.receivedEmailId
          ? `Reply dispatched via Gmail and persisted (SentEmail #${sentDto.id} -> linked to ReceivedEmail #${sentDto.receivedEmailId}).`
          : `Email dispatched via Gmail and persisted in SentEmail (#${sentDto.id}) for ${sentDto.recipientEmail}.`,
      });
    } catch (err) {
      console.error("Network error while sending email:", err);
      setFeedback({
        type: "error",
        text: "Network error while communicating with /api/emails/send.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Outbound Email Dispatcher (SMTP)</h1>
          <p className={styles.subtitle}>
            Dispatch persistent emails via pre-configured Gmail credentials to
            registered platform users.
          </p>
        </div>
        <div className={styles.navActions}>
          <Link href="/emails/inbox" className={styles.btn}>
            📥 Open Email Inbox
          </Link>
        </div>
      </header>

      {replyTarget && (
        <div className={styles.replyBanner}>
          <div style={{ flex: 1 }}>
            <p className={styles.replyBannerTitle}>
              ↩️ Replying to Received Email #{replyTarget.id} (FK Mapping
              Active)
            </p>
            <p className={styles.replyBannerMeta}>
              <strong>From:</strong> {replyTarget.user.email} (User ID:{" "}
              {replyTarget.userId}) &bull; <strong>Received:</strong>{" "}
              {new Date(replyTarget.receivedAt).toLocaleString()}
            </p>
            <div className={styles.replyBannerQuote}>{replyTarget.body}</div>
          </div>
          <button
            type="button"
            onClick={handleClearReplyContext}
            className={styles.btn}
            title="Cancel reply linkage and compose standalone email"
          >
            ✕ Detach Reply
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`${styles.messageBox} ${
            feedback.type === "success"
              ? styles.messageSuccess
              : styles.messageError
          }`}
        >
          {feedback.type === "success" ? "✅ " : "❌ "}
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Recipient (Registered Platform User)
            <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            list="registered-users-datalist"
            value={userSearchInput}
            onChange={(e) => handleUserSearchChange(e.target.value)}
            disabled={loadingInitial || !!replyTarget}
            placeholder={
              loadingInitial
                ? "Loading registered users..."
                : "Search by email or user ID..."
            }
            className={styles.input}
          />
          <datalist id="registered-users-datalist">
            {users.map((u) => (
              <option key={u.id} value={`${u.email} (ID: ${u.id})`} />
            ))}
          </datalist>
          <div className={styles.helperText}>
            {replyTarget
              ? `Recipient is locked to User #${replyTarget.userId} (${replyTarget.user.email}) to preserve foreign key integrity with ReceivedEmail #${replyTarget.id}.`
              : "Only users registered in the master User table can receive platform emails."}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Subject
            <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className={styles.input}
            maxLength={255}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Message Body
            <span className={styles.required}>*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here..."
            className={styles.textarea}
          />
        </div>

        <button
          type="submit"
          disabled={sending || loadingInitial || !selectedUserId}
          className={`${styles.btn} ${styles.btnPrimary}`}
          style={{ width: "100%", padding: "12px" }}
        >
          {sending
            ? "Dispatching via Gmail SMTP..."
            : replyTarget
              ? `Send Reply & Link to ReceivedEmail #${replyTarget.id}`
              : "Send Email & Persist in SentEmail"}
        </button>
      </form>
    </div>
  );
}
