"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  ReceivedEmailDto,
  SentEmailDto,
  InboxListResponseDto,
  ImapSyncResultDto,
} from "../../../lib/dtos/email.dto";
import styles from "./EmailInbox.module.css";

export default function EmailInboxView() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all",
  );

  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmailDto[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmailDto[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [syncingImap, setSyncingImap] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 1. Fetch Received & Sent Emails from GET /api/emails/inbox
  const loadInboxData = useCallback(
    async (filterValue: "all" | "unread" | "read") => {
      setLoading(true);
      try {
        const res = await fetch(`/api/emails/inbox?filter=${filterValue}`);
        const data: InboxListResponseDto & { error?: string } =
          await res.json();

        if (res.ok && data.success) {
          setReceivedEmails(data.receivedEmails || []);
          setSentEmails(data.sentEmails || []);
        } else {
          setStatusMessage(
            `❌ Error loading inbox: ${data.error || "Unknown error"}`,
          );
        }
      } catch (err) {
        console.error("Failed to fetch inbox records:", err);
        setStatusMessage("❌ Network error while fetching email records.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadInboxData(readFilter);
  }, [readFilter, loadInboxData]);

  // 2. Trigger Gmail IMAP Synchronization (POST /api/emails/inbox)
  const handleSyncImap = async () => {
    setSyncingImap(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/emails/inbox", {
        method: "POST",
      });
      const data: ImapSyncResultDto & { error?: string } = await res.json();

      if (!res.ok || !data.success) {
        setStatusMessage(
          `❌ IMAP Sync Error: ${data.error || "Failed to sync Gmail."}`,
        );
        return;
      }

      setStatusMessage(
        `✅ IMAP Sync complete: ${data.syncedCount} new email(s) ingested from registered users (${data.skippedUnknownSenders} unknown sender(s) ignored, ${data.skippedDuplicates} duplicate(s) skipped).`,
      );
      await loadInboxData(readFilter);
    } catch (err) {
      console.error("IMAP Sync network failure:", err);
      setStatusMessage("❌ Network error during Gmail IMAP synchronization.");
    } finally {
      setSyncingImap(false);
    }
  };

  // 3. Toggle Read / Unread flag on a ReceivedEmail (PATCH /api/emails/inbox)
  const handleToggleReadStatus = async (
    e: React.MouseEvent | React.ChangeEvent,
    email: ReceivedEmailDto,
  ) => {
    e.stopPropagation();
    const nextReadState = !email.isRead;

    // Optimistic UI update
    setReceivedEmails((prev) =>
      prev.map((item) =>
        item.id === email.id ? { ...item, isRead: nextReadState } : item,
      ),
    );

    try {
      const res = await fetch("/api/emails/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedEmailId: email.id,
          isRead: nextReadState,
        }),
      });

      if (!res.ok) {
        // Revert on failure and reload
        await loadInboxData(readFilter);
      } else if (readFilter !== "all") {
        // Refresh list if active filter excludes the updated state
        await loadInboxData(readFilter);
      }
    } catch (err) {
      console.error("Failed to toggle read status:", err);
      await loadInboxData(readFilter);
    }
  };

  // 4. Clicking a ReceivedEmail navigates to /emails/send with FK mapping
  const handleReplyToReceivedEmail = (receivedId: number) => {
    router.push(`/emails/send?replyToReceivedId=${receivedId}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Relational Email Hub (Received & Sent)
          </h1>
          <p className={styles.subtitle}>
            Inspect cross-referenced SentEmail and ReceivedEmail threads. Click
            any received email to reply and bind foreign keys.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleSyncImap}
            disabled={syncingImap}
            className={styles.btn}
          >
            {syncingImap ? "🔄 Syncing Gmail IMAP..." : "🔄 Sync Gmail (IMAP)"}
          </button>
          <Link
            href="/emails/send"
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            ✉️ Compose Email
          </Link>
        </div>
      </header>

      {statusMessage && (
        <div className={styles.statusBanner}>{statusMessage}</div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.tabGroup}>
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`${styles.btn} ${
              activeTab === "received" ? styles.btnActiveTab : ""
            }`}
          >
            📥 Received Emails ({receivedEmails.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`${styles.btn} ${
              activeTab === "sent" ? styles.btnActiveTab : ""
            }`}
          >
            📤 Sent Emails ({sentEmails.length})
          </button>
        </div>

        {/* Read / Unread Filter applies strictly to Received Emails */}
        {activeTab === "received" && (
          <div className={styles.filterGroup}>
            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
              Filter Status:
            </span>
            {(["all", "unread", "read"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setReadFilter(f)}
                className={`${styles.btn} ${
                  readFilter === f ? styles.btnActiveTab : ""
                }`}
              >
                {f === "all" ? "All" : f === "unread" ? "Unread" : "✓ Read"}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading email records...</div>
      ) : activeTab === "received" ? (
        receivedEmails.length === 0 ? (
          <div className={styles.emptyState}>
            No received emails matching filter &ldquo;{readFilter}&rdquo;. Click{" "}
            <strong>Sync Gmail (IMAP)</strong> to pull messages from registered
            users.
          </div>
        ) : (
          <div className={styles.emailList}>
            {receivedEmails.map((rec) => (
              <div
                key={rec.id}
                onClick={() => handleReplyToReceivedEmail(rec.id)}
                className={`${styles.emailCard} ${styles.emailCardClickable} ${
                  rec.isRead ? styles.emailCardRead : styles.emailCardUnread
                }`}
                title="Click to reply to this email and map SentEmail.receivedEmailId"
              >
                <div className={styles.cardTopRow}>
                  <h3 className={styles.subjectLine}>
                    <span>
                      #{rec.id} &mdash; {rec.subject}
                    </span>
                  </h3>

                  {/* Read / Unread Checkbox Flag (Stops propagation so row click doesn't fire) */}
                  <label
                    className={styles.readToggleLabel}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={rec.isRead}
                      onChange={(e) => handleToggleReadStatus(e, rec)}
                    />
                    <span
                      style={{
                        color: rec.isRead ? "#34d399" : "#60a5fa",
                      }}
                    >
                      {rec.isRead ? "✓ Read" : "Unread"}
                    </span>
                  </label>
                </div>

                <div className={styles.metaRow}>
                  <span>
                    <strong>From User:</strong> {rec.user.email} (ID:{" "}
                    {rec.userId})
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong>Received:</strong>{" "}
                    {new Date(rec.receivedAt).toLocaleString()}
                  </span>
                </div>

                <div className={styles.bodyPreview}>{rec.body}</div>

                <div className={styles.badgeRow}>
                  <div className={styles.badgesLeft}>
                    {rec.parentSentEmail ? (
                      <span
                        className={`${styles.badge} ${styles.badgeMatched}`}
                      >
                        🔗 Matched Reply to SentEmail #{rec.parentSentEmail.id}{" "}
                        (&ldquo;{rec.parentSentEmail.subject}&rdquo;)
                      </span>
                    ) : (
                      <span
                        className={`${styles.badge} ${styles.badgeStandalone}`}
                      >
                        🆕 Standalone Inbound Email (sentEmailId: NULL)
                      </span>
                    )}

                    {rec.sentReplies.length > 0 && (
                      <span
                        className={`${styles.badge} ${styles.badgeReplied}`}
                      >
                        ↩️ You Replied ({rec.sentReplies.length}): SentEmail #
                        {rec.sentReplies.map((r) => r.id).join(", #")}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplyToReceivedEmail(rec.id);
                    }}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ padding: "5px 12px", fontSize: "12px" }}
                  >
                    ↩️ Reply to Email
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : sentEmails.length === 0 ? (
        <div className={styles.emptyState}>
          No outbound emails recorded yet. Click <strong>Compose Email</strong>{" "}
          to dispatch your first message.
        </div>
      ) : (
        <div className={styles.emailList}>
          {sentEmails.map((sent) => (
            <div key={sent.id} className={styles.emailCard}>
              <div className={styles.cardTopRow}>
                <h3 className={styles.subjectLine}>
                  <span>
                    #{sent.id} &mdash; {sent.subject}
                  </span>
                </h3>
                <span className={styles.badge}>
                  Sent: {new Date(sent.createdAt).toLocaleString()}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span>
                  <strong>To Registered User:</strong> {sent.user.email} (ID:{" "}
                  {sent.userId})
                </span>
                <span>&bull;</span>
                <span>
                  <strong>RFC Message-ID:</strong> {sent.messageId}
                </span>
              </div>

              <div className={styles.bodyPreview}>{sent.body}</div>

              <div className={styles.badgeRow}>
                <div className={styles.badgesLeft}>
                  {sent.parentReceivedEmail ? (
                    <span className={`${styles.badge} ${styles.badgeMatched}`}>
                      ↩️ Sent as Reply to ReceivedEmail #
                      {sent.parentReceivedEmail.id} (&ldquo;
                      {sent.parentReceivedEmail.subject}&rdquo;)
                    </span>
                  ) : (
                    <span className={styles.badge}>
                      📤 Initial Outbound Email (receivedEmailId: NULL)
                    </span>
                  )}

                  {sent.receivedReplies.length > 0 && (
                    <span className={`${styles.badge} ${styles.badgeReplied}`}>
                      💬 User Replied ({sent.receivedReplies.length}):
                      ReceivedEmail #
                      {sent.receivedReplies.map((r) => r.id).join(", #")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
