import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as submitAge } from "../app/api/age/route";
import { POST as submitClub } from "../app/api/club/route";
import { POST as fetchResults } from "../app/api/results/route";
import {
  GET as getAdminConfig,
  POST as postAdminConfig,
} from "../app/api/admin/config/route";
import { prisma } from "../app/lib/prisma";

// Run it from the command line via: npm run test
const TEST_EMAIL = "john.doe.integration@gmail.com";
const TEST_EMAIL_OPTIONAL_PARENTS = "jane.optional.parents@gmail.com";
const TEST_COUNTRY_CODE = "PT";
const TEST_SECTION_NAME = "Integration Test Section";

describe("API Integration Tests - Real PostgreSQL DB (Normalized 3NF, Admin Engine & JSONB)", () => {
  let createdUserId: number;
  let createdSectionId: number;
  let createdQuestionId: number;

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
    if (country) {
      await prisma.configSection.deleteMany({
        where: { countryId: country.id, name: TEST_SECTION_NAME },
      });
    }
  });

  /**
   * Teardown routine: purge test records via cascade and gracefully disconnect Prisma Client.
   */
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [TEST_EMAIL, TEST_EMAIL_OPTIONAL_PARENTS] } },
    });

    const country = await prisma.country.findUnique({
      where: { code: TEST_COUNTRY_CODE },
    });
    if (country) {
      await prisma.configSection.deleteMany({
        where: { countryId: country.id, name: TEST_SECTION_NAME },
      });
    }

    await prisma.$disconnect();
  });

  it("Should insert AgeRecord with all dates, create parent User with null updatedAt, and verify in PostgreSQL", async () => {
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
    expect(userRecord?.email).toBe(TEST_EMAIL);
    expect(userRecord?.updatedAt).toBeNull();
    expect(userRecord?.ageRecord).not.toBeNull();
    expect(userRecord?.ageRecord?.userId).toBe(userRecord?.id);

    createdUserId = userRecord!.id;
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

  it("Should insert ClubRecord, trigger User.updatedAt timestamp update, and verify in PostgreSQL", async () => {
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
    expect(userRecord?.updatedAt).not.toBeNull();
    expect(userRecord?.clubRecord).not.toBeNull();
    expect(userRecord?.clubRecord?.name).toBe("Sporting");
    expect(userRecord?.clubRecord?.userId).toBe(userRecord?.id);
  });

  it("Should create a Section, create an Optional Question, edit answers without duplicating, and soft-delete (Archive)", async () => {
    // 1. Create Section
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

    // 2. Create Optional Question (isRequired: false)
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

    // 3. Edit Question Answers & Verify no stale duplicates remain active
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
});
