/**
 * ============================================================================
 * Email Engine Data Transfer Objects (DTOs) & Sanitizing Mappers
 * ============================================================================
 * Purpose: Enforces strict JSON contracts between Next.js API routes and React
 * client components. Prevents raw Prisma BigInt or Date primitives from
 * leaking unserialized across the network boundary.
 * ============================================================================
 */

// ==========================================
// 1. INBOUND REQUEST DTOs (.NET Defensive Style)
// ==========================================

export interface RawSendEmailRequestBody {
  userId?: unknown;
  subject?: unknown;
  body?: unknown;
  receivedEmailId?: unknown;
}

export interface RawToggleReadRequestBody {
  receivedEmailId?: unknown;
  isRead?: unknown;
}

// ==========================================
// 2. OUTBOUND RESPONSE DTOs (JSON & BigInt Safe)
// ==========================================

export interface EmailUserSummaryDto {
  id: number;
  email: string;
  identificationNumber: string; // Serialized from Prisma BigInt
  phoneNumber: string; // Serialized from Prisma BigInt
  countryCode: string | null;
}

export interface LinkedEmailPreviewDto {
  id: number;
  subject: string;
  messageId: string;
  createdAt: string; // ISO-8601 string
}

export interface SentEmailResponseDto {
  id: number;
  userId: number;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
  receivedEmailId: number | null;
  createdAt: string;
}

export interface ReceivedEmailDto {
  id: number;
  userId: number;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo: string | null;
  isRead: boolean;
  sentEmailId: number | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string | null;
  user: EmailUserSummaryDto;
  parentSentEmail: LinkedEmailPreviewDto | null;
  sentReplies: LinkedEmailPreviewDto[];
}

export interface SentEmailDto {
  id: number;
  userId: number;
  subject: string;
  body: string;
  messageId: string;
  receivedEmailId: number | null;
  createdAt: string;
  user: EmailUserSummaryDto;
  parentReceivedEmail: LinkedEmailPreviewDto | null;
  receivedReplies: LinkedEmailPreviewDto[];
}

export interface InboxListResponseDto {
  success: boolean;
  filter: "all" | "read" | "unread";
  receivedEmails: ReceivedEmailDto[];
  sentEmails: SentEmailDto[];
}

export interface ImapSyncResultDto {
  success: boolean;
  syncedCount: number;
  skippedUnknownSenders: number;
  skippedDuplicates: number;
  message?: string;
}

// ==========================================
// 3. SANITIZING ENTITY-TO-DTO MAPPERS
// ==========================================

/**
 * Safely converts a Prisma User record (containing 64-bit BigInt columns)
 * into a serializable EmailUserSummaryDto.
 */
export function mapUserToEmailSummaryDto(user: {
  id: number;
  email: string;
  identificationNumber: bigint;
  phoneNumber: bigint;
  country?: { code: string } | null;
}): EmailUserSummaryDto {
  return {
    id: user.id,
    email: user.email,
    identificationNumber: user.identificationNumber.toString(),
    phoneNumber: user.phoneNumber.toString(),
    countryCode: user.country?.code ?? null,
  };
}

/**
 * Safely converts a relational Prisma ReceivedEmail entity into a ReceivedEmailDto.
 */
export function mapReceivedEmailToDto(rec: {
  id: number;
  userId: number;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo: string | null;
  isRead: boolean;
  sentEmailId: number | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    id: number;
    email: string;
    identificationNumber: bigint;
    phoneNumber: bigint;
    country?: { code: string } | null;
  };
  parentEmail?: {
    id: number;
    subject: string;
    messageId: string;
    createdAt: Date;
  } | null;
  replies?: {
    id: number;
    subject: string;
    messageId: string;
    createdAt: Date;
  }[];
}): ReceivedEmailDto {
  return {
    id: rec.id,
    userId: rec.userId,
    subject: rec.subject,
    body: rec.body,
    messageId: rec.messageId,
    inReplyTo: rec.inReplyTo,
    isRead: rec.isRead,
    sentEmailId: rec.sentEmailId,
    receivedAt: rec.receivedAt.toISOString(),
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt ? rec.updatedAt.toISOString() : null,
    user: mapUserToEmailSummaryDto(rec.user),
    parentSentEmail: rec.parentEmail
      ? {
          id: rec.parentEmail.id,
          subject: rec.parentEmail.subject,
          messageId: rec.parentEmail.messageId,
          createdAt: rec.parentEmail.createdAt.toISOString(),
        }
      : null,
    sentReplies: (rec.replies || []).map((r) => ({
      id: r.id,
      subject: r.subject,
      messageId: r.messageId,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Safely converts a relational Prisma SentEmail entity into a SentEmailDto.
 */
export function mapSentEmailToDto(sent: {
  id: number;
  userId: number;
  subject: string;
  body: string;
  messageId: string;
  receivedEmailId: number | null;
  createdAt: Date;
  user: {
    id: number;
    email: string;
    identificationNumber: bigint;
    phoneNumber: bigint;
    country?: { code: string } | null;
  };
  parentEmail?: {
    id: number;
    subject: string;
    messageId: string;
    receivedAt: Date;
  } | null;
  replies?: {
    id: number;
    subject: string;
    messageId: string;
    receivedAt: Date;
  }[];
}): SentEmailDto {
  return {
    id: sent.id,
    userId: sent.userId,
    subject: sent.subject,
    body: sent.body,
    messageId: sent.messageId,
    receivedEmailId: sent.receivedEmailId,
    createdAt: sent.createdAt.toISOString(),
    user: mapUserToEmailSummaryDto(sent.user),
    parentReceivedEmail: sent.parentEmail
      ? {
          id: sent.parentEmail.id,
          subject: sent.parentEmail.subject,
          messageId: sent.parentEmail.messageId,
          createdAt: sent.parentEmail.receivedAt.toISOString(),
        }
      : null,
    receivedReplies: (sent.replies || []).map((r) => ({
      id: r.id,
      subject: r.subject,
      messageId: r.messageId,
      createdAt: r.receivedAt.toISOString(),
    })),
  };
}
