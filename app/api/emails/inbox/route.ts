import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { fetchRecentGmailMessages } from "../../../lib/emailClient";
import {
  mapReceivedEmailToDto,
  mapSentEmailToDto,
  type RawToggleReadRequestBody,
  type InboxListResponseDto,
  type ImapSyncResultDto,
} from "../../../lib/dtos/email.dto";
import { z } from "zod";

/**
 * ============================================================================
 * GET, POST & PATCH /api/emails/inbox
 * ============================================================================
 * Purpose:
 * - GET: Retrieves SentEmail and ReceivedEmail records mapped through
 *        strict BigInt-safe DTOs with read/unread filtering.
 * - POST: Polls Gmail via IMAP, filters strictly by registered User emails,
 *         resolves In-Reply-To against SentEmail.messageId, and persists new rows.
 * - PATCH: Toggles the boolean isRead flag on a specific ReceivedEmail record.
 * ============================================================================
 */

const toggleReadSchema = z.object({
  receivedEmailId: z.coerce
    .number()
    .int("Received email ID must be an integer.")
    .positive("Received email ID must be positive."),
  isRead: z.boolean({
    message: "isRead flag must be a valid boolean.",
  }),
});

/**
 * GET /api/emails/inbox?filter=all|read|unread&receivedId=optional
 * Returns sanitized lists of ReceivedEmail and SentEmail DTOs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFilter = (searchParams.get("filter") || "all").toLowerCase();
    const filterParam: "all" | "read" | "unread" =
      rawFilter === "read" || rawFilter === "unread" ? rawFilter : "all";
    const receivedIdParam = searchParams.get("receivedId");

    // Optional single ReceivedEmail lookup for hydrating the reply composer
    if (receivedIdParam) {
      const parsedId = parseInt(receivedIdParam, 10);
      if (Number.isNaN(parsedId) || parsedId < 1) {
        return NextResponse.json(
          { error: "Invalid receivedId query parameter." },
          { status: 400 },
        );
      }

      const singleReceived = await prisma.receivedEmail.findUnique({
        where: { id: parsedId },
        include: {
          user: { include: { country: true } },
          parentEmail: true,
          replies: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!singleReceived) {
        return NextResponse.json(
          { error: "Received email record not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        receivedEmail: mapReceivedEmailToDto(singleReceived),
      });
    }

    const whereClause =
      filterParam === "read"
        ? { isRead: true }
        : filterParam === "unread"
          ? { isRead: false }
          : {};

    const [receivedRecords, sentRecords] = await Promise.all([
      prisma.receivedEmail.findMany({
        where: whereClause,
        include: {
          user: { include: { country: true } },
          parentEmail: true,
          replies: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { receivedAt: "desc" },
      }),
      prisma.sentEmail.findMany({
        include: {
          user: { include: { country: true } },
          parentEmail: true,
          replies: { orderBy: { receivedAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const responsePayload: InboxListResponseDto = {
      success: true,
      filter: filterParam,
      receivedEmails: receivedRecords.map(mapReceivedEmailToDto),
      sentEmails: sentRecords.map(mapSentEmailToDto),
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("CRITICAL: GET /api/emails/inbox Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load inbox records." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/emails/inbox
 * Synchronizes incoming emails from Gmail IMAP into ReceivedEmail.
 * Enforces registered-user filtering and automatic SentEmail FK resolution.
 */
export async function POST() {
  try {
    // 1. Load all registered platform users into an O(1) lookup map
    const registeredUsers = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    const userByEmailMap = new Map<string, number>();
    for (const u of registeredUsers) {
      userByEmailMap.set(u.email.trim().toLowerCase(), u.id);
    }

    if (userByEmailMap.size === 0) {
      const emptySyncResponse: ImapSyncResultDto = {
        success: true,
        syncedCount: 0,
        skippedUnknownSenders: 0,
        skippedDuplicates: 0,
        message: "No registered users in database to match incoming emails.",
      };
      return NextResponse.json(emptySyncResponse);
    }

    // 2. Poll recent messages from Gmail IMAP
    const inboundMessages = await fetchRecentGmailMessages(50);

    // 3. Pre-load existing ReceivedEmail messageIds and SentEmail messageIds
    const [existingReceived, existingSent] = await Promise.all([
      prisma.receivedEmail.findMany({
        select: { messageId: true },
      }),
      prisma.sentEmail.findMany({
        select: { id: true, messageId: true, userId: true },
      }),
    ]);

    const existingReceivedIds = new Set(
      existingReceived.map((r) => r.messageId),
    );

    const sentByMessageIdMap = new Map<
      string,
      { id: number; userId: number }
    >();
    for (const s of existingSent) {
      sentByMessageIdMap.set(s.messageId, { id: s.id, userId: s.userId });
    }

    let syncedCount = 0;
    let skippedUnknownSenders = 0;
    let skippedDuplicates = 0;

    // 4. Filter, resolve foreign keys, and persist new incoming emails
    for (const msg of inboundMessages) {
      const matchedUserId = userByEmailMap.get(msg.fromEmail);

      // Strict Domain Rule: Only emails from registered platform users are allowed
      if (!matchedUserId) {
        skippedUnknownSenders++;
        continue;
      }

      // Idempotency guard: Skip emails already ingested
      if (existingReceivedIds.has(msg.messageId)) {
        skippedDuplicates++;
        continue;
      }

      // Resolve SentEmail FK if In-Reply-To matches a SentEmail sent to this user
      let resolvedSentEmailId: number | null = null;
      if (msg.inReplyTo) {
        const parentSent = sentByMessageIdMap.get(msg.inReplyTo);
        if (parentSent && parentSent.userId === matchedUserId) {
          resolvedSentEmailId = parentSent.id;
        }
      }

      await prisma.receivedEmail.create({
        data: {
          userId: matchedUserId,
          subject: msg.subject,
          body: msg.body,
          messageId: msg.messageId,
          inReplyTo: msg.inReplyTo,
          isRead: false,
          sentEmailId: resolvedSentEmailId,
          receivedAt: msg.receivedAt,
          updatedAt: null,
        },
      });

      existingReceivedIds.add(msg.messageId);
      syncedCount++;
    }

    const syncResult: ImapSyncResultDto = {
      success: true,
      syncedCount,
      skippedUnknownSenders,
      skippedDuplicates,
    };

    return NextResponse.json(syncResult);
  } catch (error: any) {
    console.error("CRITICAL: POST /api/emails/inbox (IMAP Sync) Error:", error);
    return NextResponse.json(
      {
        error:
          error.message || "Failed to synchronize incoming emails via IMAP.",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/emails/inbox
 * Updates the mutable isRead boolean flag on a ReceivedEmail record.
 */
export async function PATCH(request: Request) {
  try {
    const rawBody: RawToggleReadRequestBody = await request.json();

    const validation = toggleReadSchema.safeParse({
      receivedEmailId: rawBody.receivedEmailId,
      isRead: rawBody.isRead,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { receivedEmailId, isRead } = validation.data;

    const existingRecord = await prisma.receivedEmail.findUnique({
      where: { id: receivedEmailId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: `ReceivedEmail #${receivedEmailId} not found.` },
        { status: 404 },
      );
    }

    const updated = await prisma.receivedEmail.update({
      where: { id: receivedEmailId },
      data: {
        isRead,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receivedEmail: {
        id: updated.id,
        isRead: updated.isRead,
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error("CRITICAL: PATCH /api/emails/inbox Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update email read status." },
      { status: 500 },
    );
  }
}
