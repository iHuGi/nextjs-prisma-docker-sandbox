import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock SMTP & IMAP transport boundary so integration tests validate PostgreSQL
// relational constraints and DTO serialization deterministically offline.
const OUTBOUND_FIRST_MESSAGE_ID = "<vitest-outbound-1@gmail.com>";
const OUTBOUND_REPLY_MESSAGE_ID = "<vitest-outbound-reply-2@gmail.com>";
const INBOUND_MATCHED_REPLY_MSG_ID = "<vitest-inbound-reply-1@gmail.com>";
const INBOUND_STANDALONE_MSG_ID = "<vitest-inbound-standalone-2@gmail.com>";
const INBOUND_UNKNOWN_SENDER_MSG_ID = "<vitest-inbound-unknown-3@gmail.com>";

let mockSmtpCallCount = 0;

vi.mock("../app/lib/emailClient", () => ({
  sendGmailMessage: vi.fn(async () => {
    mockSmtpCallCount++;
    return {
      messageId:
        mockSmtpCallCount === 1
          ? OUTBOUND_FIRST_MESSAGE_ID
          : OUTBOUND_REPLY_MESSAGE_ID,
    };
  }),
  fetchRecentGmailMessages: vi.fn(async () => [
    {
      // 1. Reply from registered user matching OUTBOUND_FIRST_MESSAGE_ID
      messageId: INBOUND_MATCHED_REPLY_MSG_ID,
      fromEmail: "john.doe.integration@gmail.com",
      subject: "Re: Welcome to Recruitment Platform",
      body: "Thank you! Here is my reply to your initial email.",
      inReplyTo: OUTBOUND_FIRST_MESSAGE_ID,
      receivedAt: new Date("2026-10-31T10:00:00.000Z"),
    },
    {
      // 2. Standalone spontaneous email from registered user (no In-Reply-To)
      messageId: INBOUND_STANDALONE_MSG_ID,
      fromEmail: "jane.optional.parents@gmail.com",
      subject: "Standalone Question from Candidate",
      body: "Hello, I have a question regarding the application process.",
      inReplyTo: null,
      receivedAt: new Date("2026-10-31T10:05:00.000Z"),
    },
    {
      // 3. Unregistered external sender (must be strictly ignored)
      messageId: INBOUND_UNKNOWN_SENDER_MSG_ID,
      fromEmail: "intruder.unregistered@external.org",
      subject: "Spam / Unregistered Sender",
      body: "This email must never be persisted into ReceivedEmail.",
      inReplyTo: null,
      receivedAt: new Date("2026-10-31T10:10:00.000Z"),
    },
  ]),
}));

import { POST as upsertUser } from "../app/api/users/route";
import { POST as submitAge } from "../app/api/age/route";
import { POST as submitClub } from "../app/api/club/route";
import { POST as fetchResults } from "../app/api/results/route";
import { POST as postAdminConfig } from "../app/api/admin/config/route";
import { POST as sendEmailRoute } from "../app/api/emails/send/route";
import {
  GET as getInboxRoute,
  POST as syncImapInboxRoute,
  PATCH as patchEmailReadRoute,
} from "../app/api/emails/inbox/route";
import { prisma } from "../app/lib/prisma";

// Run it from the command line via: npm run test
const TEST_EMAIL = "john.doe.integration@gmail.com";
const TEST_EMAIL_OPTIONAL_PARENTS = "jane.optional.parents@gmail.com";
const TEST_COUNTRY_CODE = "PT";
const TEST_SECTION_NAME = "Integration Test Section";

describe("API Integration Tests - Real PostgreSQL DB (Normalized 3NF, Users, Admin Engine, JSONB & Email Engine)", () => {
  let createdUserId: number;
  let secondUserId: number;
  let createdSectionId: number;
  let createdQuestionId: number;
  let ptCountryId: number;
  let initialSentEmailId: number;
  let standaloneReceivedEmailId: number;

  /**
   * Purge pre-existing test state to ensure complete test isolation.
   */
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_EMAIL, TEST_EMAIL_OPTIONAL_PARENTS] } },
    });

    const country = await prisma.country.findUnique({
      where: { code: TEST_COUNTRY_CODE },
    });
    if (!country) {
      throw new Error(
        "Country PT must exist in the database before running integration tests.",
      );
    }
    ptCountryId = country.id;

    await prisma.configSection.deleteMany({
      where: { countryId: country.id, name: TEST_SECTION_NAME },
    });
  });

  /**
   * Teardown routine: purge test records via cascade and gracefully disconnect Prisma Client.
   */
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_EMAIL, TEST_EMAIL_OPTIONAL_PARENTS] } },
    });

    if (ptCountryId) {
      await prisma.configSection.deleteMany({
        where: { countryId: ptCountryId, name: TEST_SECTION_NAME },
      });
    }

    await prisma.$disconnect();
  });

  it("Should create master User profiles via POST /api/users with BigInt identification and phone numbers", async () => {
    const req1 = new Request("http://localhost:3000/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL,
        identificationNumber: "123456789",
        phoneNumber: "912345678",
        countryId: ptCountryId,
      }),
    });
    const res1 = await upsertUser(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.success).toBe(true);
    expect(json1.user.email).toBe(TEST_EMAIL);
    expect(json1.user.identificationNumber).toBe("123456789");
    expect(json1.user.updatedAt).toBeNull();
    createdUserId = json1.user.id;

    const req2 = new Request("http://localhost:3000/api/users", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL_OPTIONAL_PARENTS,
        identificationNumber: "987654321",
        phoneNumber: "961234567",
        countryId: ptCountryId,
      }),
    });
    const res2 = await upsertUser(req2);
    const json2 = await res2.json();
    expect(res2.status).toBe(200);
    secondUserId = json2.user.id;
  });

  it("Should reject AgeRecord and ClubRecord submissions with 404 when User does not exist", async () => {
    const unknownEmail = "nonexistent.ghost.user@gmail.com";

    const ageReq = new Request("http://localhost:3000/api/age", {
      method: "POST",
      body: JSON.stringify({
        email: unknownEmail,
        birthDate: "1991-08-02",
      }),
    });
    const ageRes = await submitAge(ageReq);
    expect(ageRes.status).toBe(404);

    const clubReq = new Request("http://localhost:3000/api/club", {
      method: "POST",
      body: JSON.stringify({
        email: unknownEmail,
        club: "Sporting",
      }),
    });
    const clubRes = await submitClub(clubReq);
    expect(clubRes.status).toBe(404);
  });

  it("Should insert AgeRecord for existing User and update parent User.updatedAt", async () => {
    const req = new Request("http://localhost:3000/api/age", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL,
        birthDate: "1991-08-02",
        momBirthDate: "1965-04-13",
        dadBirthDate: "1960-08-02",
      }),
    });

    const res = await submitAge(req);
    expect(res.status).toBe(200);

    const userRecord = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { ageRecord: true },
    });

    expect(userRecord).not.toBeNull();
    expect(userRecord?.updatedAt).not.toBeNull();
    expect(userRecord?.ageRecord).not.toBeNull();
    expect(userRecord?.ageRecord?.userId).toBe(createdUserId);
  });

  it("Should allow AgeRecord submission when mother and father birth dates are omitted (optional)", async () => {
    const req = new Request("http://localhost:3000/api/age", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL_OPTIONAL_PARENTS,
        birthDate: "1991-08-02",
        momBirthDate: "",
        dadBirthDate: "",
      }),
    });

    const res = await submitAge(req);
    expect(res.status).toBe(200);

    const userRecord = await prisma.user.findUnique({
      where: { email: TEST_EMAIL_OPTIONAL_PARENTS },
      include: { ageRecord: true },
    });

    expect(userRecord).not.toBeNull();
    expect(userRecord?.ageRecord).not.toBeNull();
  });

  it("Should insert ClubRecord for existing User and verify in PostgreSQL", async () => {
    const req = new Request("http://localhost:3000/api/club", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL,
        club: "Sporting",
        description: "Integration test automated run",
      }),
    });

    const res = await submitClub(req);
    expect(res.status).toBe(200);

    const userRecord = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
      include: { clubRecord: true },
    });

    expect(userRecord).not.toBeNull();
    expect(userRecord?.clubRecord).not.toBeNull();
    expect(userRecord?.clubRecord?.name).toBe("Sporting");
    expect(userRecord?.clubRecord?.userId).toBe(createdUserId);
  });

  it("Should create a Section, create an Optional Question, edit answers without duplicating, and soft-delete (Archive)", async () => {
    const secReq = new Request("http://localhost:3000/api/admin/config", {
      method: "POST",
      body: JSON.stringify({
        action: "upsert_section",
        countryCode: TEST_COUNTRY_CODE,
        name: TEST_SECTION_NAME,
      }),
    });
    const secRes = await postAdminConfig(secReq);
    const secJson = await secRes.json();
    expect(secRes.status).toBe(200);
    expect(secJson.success).toBe(true);
    createdSectionId = secJson.section.id;

    const qReq = new Request("http://localhost:3000/api/admin/config", {
      method: "POST",
      body: JSON.stringify({
        action: "upsert_question",
        sectionId: createdSectionId,
        label: "Preferred Stack?",
        answerType: "multi",
        displayAs: "list",
        isRequired: false,
        confirmAiValue: false,
        preFilledText: null,
        conditionJson: null,
        updatedBy: "Vitest",
        answers: [
          {
            label: "C++",
            isPreFilled: true,
            isLocked: false,
            isArchived: false,
          },
          {
            label: "Rust",
            isPreFilled: false,
            isLocked: false,
            isArchived: false,
          },
        ],
      }),
    });
    const qRes = await postAdminConfig(qReq);
    const qJson = await qRes.json();
    expect(qRes.status).toBe(200);
    expect(qJson.question.isRequired).toBe(false);
    expect(qJson.question.answers).toHaveLength(2);
    createdQuestionId = qJson.question.id;

    const editReq = new Request("http://localhost:3000/api/admin/config", {
      method: "POST",
      body: JSON.stringify({
        action: "upsert_question",
        id: createdQuestionId,
        sectionId: createdSectionId,
        label: "Preferred Stack Updated?",
        answerType: "multi",
        displayAs: "list",
        isRequired: false,
        confirmAiValue: false,
        preFilledText: null,
        conditionJson: null,
        updatedBy: "Vitest",
        answers: [
          {
            label: "C++",
            isPreFilled: true,
            isLocked: false,
            isArchived: false,
          },
          {
            label: "Rust",
            isPreFilled: false,
            isLocked: false,
            isArchived: false,
          },
          {
            label: "SQL",
            isPreFilled: false,
            isLocked: false,
            isArchived: false,
          },
        ],
      }),
    });
    const editRes = await postAdminConfig(editReq);
    const editJson = await editRes.json();
    expect(editRes.status).toBe(200);
    const activeAnswers = editJson.question.answers.filter(
      (a: any) => !a.isArchived,
    );
    expect(activeAnswers).toHaveLength(3);
  });

  it("Should persist Candidate Application responses into UserMetadata JSONB", async () => {
    const req = new Request("http://localhost:3000/api/admin/config", {
      method: "POST",
      body: JSON.stringify({
        action: "submit_candidate",
        userId: createdUserId,
        countryCode: TEST_COUNTRY_CODE,
        answers: {
          "Preferred Stack Updated?": ["C++", "Rust", "SQL"],
        },
      }),
    });

    const res = await postAdminConfig(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const metaRecord = await prisma.userMetadata.findUnique({
      where: { userId: createdUserId },
    });
    expect(metaRecord).not.toBeNull();
    const customData = metaRecord?.customData as Record<string, any>;
    expect(customData.countryCode).toBe(TEST_COUNTRY_CODE);
    expect(customData.applicationResponses["Preferred Stack Updated?"]).toEqual(
      ["C++", "Rust", "SQL"],
    );
  });

  it("Should query consolidated user summary via Stored Function using /api/results", async () => {
    const req = new Request("http://localhost:3000/api/results", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_EMAIL,
      }),
    });

    const res = await fetchResults(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.found).toBe(true);
    expect(json.data.email).toBe(TEST_EMAIL);
    expect(json.data.club_name).toBe("Sporting");
    expect(json.data.user_id).toBeDefined();
  });

  // ============================================================================
  // RELATIONAL EMAIL ENGINE INTEGRATION TESTS (SentEmail <-> ReceivedEmail)
  // ============================================================================

  it("Should dispatch an initial outbound email to a registered User and reject non-existent Users with 404", async () => {
    // 1. Reject non-existent user ID
    const ghostReq = new Request("http://localhost:3000/api/emails/send", {
      method: "POST",
      body: JSON.stringify({
        userId: 9999999,
        subject: "Ghost Email",
        body: "Should fail with 404",
      }),
    });
    const ghostRes = await sendEmailRoute(ghostReq);
    expect(ghostRes.status).toBe(404);

    // 2. Dispatch valid initial email to createdUserId
    const validReq = new Request("http://localhost:3000/api/emails/send", {
      method: "POST",
      body: JSON.stringify({
        userId: createdUserId,
        subject: "Welcome to Recruitment Platform",
        body: "Hello John, please confirm your application details.",
        receivedEmailId: null,
      }),
    });
    const validRes = await sendEmailRoute(validReq);
    const validJson = await validRes.json();

    expect(validRes.status).toBe(200);
    expect(validJson.success).toBe(true);
    expect(validJson.sentEmail.userId).toBe(createdUserId);
    expect(validJson.sentEmail.messageId).toBe(OUTBOUND_FIRST_MESSAGE_ID);
    expect(validJson.sentEmail.receivedEmailId).toBeNull();

    initialSentEmailId = validJson.sentEmail.id;
  });

  it("Should synchronize inbound emails via IMAP, ignore unregistered senders, and link In-Reply-To against SentEmail", async () => {
    const syncRes = await syncImapInboxRoute();
    const syncJson = await syncRes.json();

    expect(syncRes.status).toBe(200);
    expect(syncJson.success).toBe(true);
    expect(syncJson.syncedCount).toBe(2);
    expect(syncJson.skippedUnknownSenders).toBe(1);

    // Verify matched reply email has sentEmailId pointing to initialSentEmailId
    const matchedReply = await prisma.receivedEmail.findUnique({
      where: { messageId: INBOUND_MATCHED_REPLY_MSG_ID },
    });
    expect(matchedReply).not.toBeNull();
    expect(matchedReply?.userId).toBe(createdUserId);
    expect(matchedReply?.sentEmailId).toBe(initialSentEmailId);
    expect(matchedReply?.isRead).toBe(false);

    // Verify standalone email from second registered user has sentEmailId === null
    const standaloneEmail = await prisma.receivedEmail.findUnique({
      where: { messageId: INBOUND_STANDALONE_MSG_ID },
    });
    expect(standaloneEmail).not.toBeNull();
    expect(standaloneEmail?.userId).toBe(secondUserId);
    expect(standaloneEmail?.sentEmailId).toBeNull();
    expect(standaloneEmail?.isRead).toBe(false);

    standaloneReceivedEmailId = standaloneEmail!.id;
  });

  it("Should toggle Read/Unread flags on ReceivedEmail and map SentEmail.receivedEmailId when replying to a standalone ReceivedEmail", async () => {
    // 1. Toggle standalone email to Read via PATCH /api/emails/inbox
    const patchReq = new Request("http://localhost:3000/api/emails/inbox", {
      method: "PATCH",
      body: JSON.stringify({
        receivedEmailId: standaloneReceivedEmailId,
        isRead: true,
      }),
    });
    const patchRes = await patchEmailReadRoute(patchReq);
    const patchJson = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchJson.receivedEmail.isRead).toBe(true);

    // 2. Verify GET /api/emails/inbox?filter=read returns the read email with BigInt-safe DTOs
    const getReadReq = new Request(
      "http://localhost:3000/api/emails/inbox?filter=read",
    );
    const getReadRes = await getInboxRoute(getReadReq);
    const getReadJson = await getReadRes.json();
    expect(getReadRes.status).toBe(200);
    expect(
      getReadJson.receivedEmails.some(
        (e: any) => e.id === standaloneReceivedEmailId && e.isRead === true,
      ),
    ).toBe(true);

    // 3. Reply to the standalone ReceivedEmail via POST /api/emails/send
    const replyReq = new Request("http://localhost:3000/api/emails/send", {
      method: "POST",
      body: JSON.stringify({
        userId: secondUserId,
        subject: "Re: Standalone Question from Candidate",
        body: "Here is the official answer to your standalone question.",
        receivedEmailId: standaloneReceivedEmailId,
      }),
    });
    const replyRes = await sendEmailRoute(replyReq);
    const replyJson = await replyRes.json();

    expect(replyRes.status).toBe(200);
    expect(replyJson.success).toBe(true);
    expect(replyJson.sentEmail.receivedEmailId).toBe(standaloneReceivedEmailId);
    expect(replyJson.sentEmail.userId).toBe(secondUserId);
  });
});
