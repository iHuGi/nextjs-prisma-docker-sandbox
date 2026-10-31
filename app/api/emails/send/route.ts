import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { sendGmailMessage } from "../../../lib/emailClient";
import type {
  RawSendEmailRequestBody,
  SentEmailResponseDto,
} from "../../../lib/dtos/email.dto";
import { z } from "zod";

/**
 * ============================================================================
 * POST /api/emails/send
 * ============================================================================
 * Purpose: Dispatches an email via Gmail SMTP to a registered User and
 * persists the record in SentEmail. If replying to an existing ReceivedEmail,
 * binds the foreign key (receivedEmailId) and marks the parent email as read.
 * ============================================================================
 */

const sendEmailRequestSchema = z.object({
  userId: z.coerce
    .number()
    .int("User ID must be an integer.")
    .positive("Please select a valid registered user."),
  subject: z
    .string()
    .trim()
    .min(1, "Email subject cannot be empty.")
    .max(255, "Email subject cannot exceed 255 characters."),
  body: z.string().trim().min(1, "Email body cannot be empty."),
  receivedEmailId: z
    .union([z.coerce.number().int().positive(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (typeof val === "number" ? val : null)),
});

export async function POST(request: Request) {
  try {
    const rawBody: RawSendEmailRequestBody = await request.json();

    const subjectStr =
      rawBody.subject !== null && rawBody.subject !== undefined
        ? String(rawBody.subject)
        : "";
    const bodyStr =
      rawBody.body !== null && rawBody.body !== undefined
        ? String(rawBody.body)
        : "";

    const validation = sendEmailRequestSchema.safeParse({
      userId: rawBody.userId,
      subject: subjectStr,
      body: bodyStr,
      receivedEmailId:
        rawBody.receivedEmailId === "" || rawBody.receivedEmailId === null
          ? null
          : rawBody.receivedEmailId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { userId, subject, body, receivedEmailId } = validation.data;

    // 1. Verify recipient exists in master User table
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error:
            "Target user does not exist. Emails can only be sent to registered platform users.",
        },
        { status: 404 },
      );
    }

    // 2. If replying to a ReceivedEmail, verify existence and user ownership
    let parentReceivedMessageId: string | null = null;

    if (receivedEmailId !== null) {
      const parentReceived = await prisma.receivedEmail.findUnique({
        where: { id: receivedEmailId },
      });

      if (!parentReceived) {
        return NextResponse.json(
          { error: `Referenced ReceivedEmail #${receivedEmailId} not found.` },
          { status: 404 },
        );
      }

      if (parentReceived.userId !== targetUser.id) {
        return NextResponse.json(
          {
            error:
              "Relational integrity violation: The selected recipient does not match the sender of the original ReceivedEmail.",
          },
          { status: 400 },
        );
      }

      parentReceivedMessageId = parentReceived.messageId;
    }

    // 3. Dispatch email via Gmail SMTP
    const smtpResult = await sendGmailMessage({
      to: targetUser.email,
      subject,
      text: body,
      inReplyToMessageId: parentReceivedMessageId,
    });

    // 4. Persist SentEmail and update parent ReceivedEmail.isRead atomically
    const now = new Date();

    const createdRecord = await prisma.$transaction(async (tx) => {
      const sentRecord = await tx.sentEmail.create({
        data: {
          userId: targetUser.id,
          subject,
          body,
          messageId: smtpResult.messageId,
          receivedEmailId,
        },
      });

      if (receivedEmailId !== null) {
        await tx.receivedEmail.update({
          where: { id: receivedEmailId },
          data: {
            isRead: true,
            updatedAt: now,
          },
        });
      }

      return sentRecord;
    });

    const responseDto: SentEmailResponseDto = {
      id: createdRecord.id,
      userId: createdRecord.userId,
      recipientEmail: targetUser.email,
      subject: createdRecord.subject,
      body: createdRecord.body,
      messageId: createdRecord.messageId,
      receivedEmailId: createdRecord.receivedEmailId,
      createdAt: createdRecord.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      sentEmail: responseDto,
    });
  } catch (error: any) {
    console.error("CRITICAL: POST /api/emails/send Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to dispatch or persist outbound email record.",
      },
      { status: 500 },
    );
  }
}
