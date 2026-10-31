import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

/**
 * ============================================================================
 * Gmail SMTP & IMAP Service Layer
 * ============================================================================
 * Purpose: Encapsulates outbound SMTP dispatch via Nodemailer and inbound
 * IMAP mailbox polling via ImapFlow using environment-level credentials.
 * ============================================================================
 */

export interface SendGmailParams {
  to: string;
  subject: string;
  text: string;
  inReplyToMessageId?: string | null;
}

export interface SendGmailResult {
  messageId: string;
}

export interface ParsedInboundEmail {
  messageId: string;
  fromEmail: string;
  subject: string;
  body: string;
  inReplyTo: string | null;
  receivedAt: Date;
}

/**
 * Validates and retrieves Gmail credentials from environment variables.
 */
function getGmailCredentials(): { user: string; pass: string } {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    throw new Error(
      "Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables.",
    );
  }

  return { user, pass };
}

/**
 * Normalizes RFC 5322 Message-ID strings to ensure consistent database lookups.
 */
export function normalizeMessageId(
  rawId: string | null | undefined,
): string | null {
  if (!rawId) return null;
  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Dispatches an outbound email through Gmail SMTP (Port 465 SSL).
 * Injects In-Reply-To and References headers when replying to an existing thread.
 */
export async function sendGmailMessage(
  params: SendGmailParams,
): Promise<SendGmailResult> {
  const { user, pass } = getGmailCredentials();

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const normalizedReplyId = normalizeMessageId(params.inReplyToMessageId);

  const mailOptions: SendMailOptions = {
    from: user,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(normalizedReplyId
      ? {
          inReplyTo: normalizedReplyId,
          references: [normalizedReplyId],
        }
      : {}),
  };

  const info = await transporter.sendMail(mailOptions);
  const generatedMessageId =
    normalizeMessageId(info.messageId) ||
    `<local-${Date.now()}-${Math.random().toString(36).slice(2)}@gmail.com>`;

  return { messageId: generatedMessageId };
}

/**
 * Connects to Gmail IMAP (Port 993 TLS), reads the latest messages from INBOX,
 * and extracts normalized RFC 5322 headers and plain-text bodies.
 */
export async function fetchRecentGmailMessages(
  maxMessages: number = 50,
): Promise<ParsedInboundEmail[]> {
  const { user, pass } = getGmailCredentials();

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const parsedEmails: ParsedInboundEmail[] = [];

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  try {
    const mailboxStatus = client.mailbox;
    const totalMessages =
      mailboxStatus && typeof mailboxStatus === "object"
        ? mailboxStatus.exists
        : 0;

    if (totalMessages === 0) {
      return [];
    }

    const startSeq = Math.max(1, totalMessages - maxMessages + 1);
    const sequenceRange = `${startSeq}:*`;

    for await (const message of client.fetch(sequenceRange, {
      envelope: true,
      source: true,
      internalDate: true,
    })) {
      if (!message.source) continue;

      const parsed = await simpleParser(message.source);

      const rawMessageId =
        normalizeMessageId(parsed.messageId) ||
        normalizeMessageId(message.envelope?.messageId);
      if (!rawMessageId) continue;

      const senderAddress =
        parsed.from?.value?.[0]?.address ||
        message.envelope?.from?.[0]?.address ||
        "";
      const normalizedFrom = senderAddress.trim().toLowerCase();
      if (!normalizedFrom || !normalizedFrom.includes("@")) continue;

      // Ignore self-sent emails appearing in INBOX
      if (normalizedFrom === user.toLowerCase()) continue;

      const rawInReplyTo =
        typeof parsed.inReplyTo === "string"
          ? normalizeMessageId(parsed.inReplyTo)
          : normalizeMessageId(message.envelope?.inReplyTo);

      const textBody =
        parsed.text?.trim() ||
        (typeof parsed.html === "string"
          ? parsed.html.replace(/<[^>]+>/g, " ").trim()
          : "") ||
        "(Empty message body)";

      const receivedDate =
        parsed.date instanceof Date && !isNaN(parsed.date.getTime())
          ? parsed.date
          : message.internalDate instanceof Date
            ? message.internalDate
            : new Date();

      parsedEmails.push({
        messageId: rawMessageId,
        fromEmail: normalizedFrom,
        subject: (parsed.subject || "(No Subject)").trim(),
        body: textBody,
        inReplyTo: rawInReplyTo,
        receivedAt: receivedDate,
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }

  return parsedEmails;
}
