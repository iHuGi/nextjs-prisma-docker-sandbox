import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  UpsertQuestionSchema,
  UpsertSectionSchema,
  validateConditionPrecedence,
  validateQuestionReorder,
  SectionQuestionNode,
} from "../../../lib/validations/adminConfig.schema";

/**
 * ============================================================================
 * GET /api/admin/config?countryCode=PT&includeArchived=true
 * GET /api/admin/config?userId=1
 * ============================================================================
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("countryCode")?.toUpperCase();
    const includeArchived = searchParams.get("includeArchived") === "true";
    const userId = searchParams.get("userId");

    // Fetch saved candidate metadata responses by userId
    if (userId !== null) {
      if (
        !userId.trim() ||
        !Number.isInteger(Number(userId)) ||
        Number(userId) <= 0
      ) {
        return NextResponse.json(
          { error: "Please provide a valid user ID." },
          { status: 400 },
        );
      }

      const metadata = await prisma.userMetadata.findUnique({
        where: { userId: Number(userId) },
      });

      return NextResponse.json({
        success: true,
        metadata: metadata || null,
      });
    }

    if (!countryCode) {
      return NextResponse.json(
        {
          error: "Please provide a valid country code (e.g., ?countryCode=PT).",
        },
        { status: 400 },
      );
    }

    const country = await prisma.country.findUnique({
      where: { code: countryCode },
      include: {
        sections: {
          ...(includeArchived ? {} : { where: { isArchived: false } }),
          orderBy: { sortOrder: "asc" },
          include: {
            questions: {
              ...(includeArchived ? {} : { where: { isArchived: false } }),
              orderBy: { sortOrder: "asc" },
              include: {
                answers: {
                  ...(includeArchived ? {} : { where: { isArchived: false } }),
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!country) {
      return NextResponse.json(
        { error: `Country with code '${countryCode}' not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, country });
  } catch (error: unknown) {
    console.error("GET Admin Config Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}

/**
 * ============================================================================
 * POST /api/admin/config
 * ============================================================================
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ------------------------------------------------------------------------
    // ACTION 1: UPSERT SECTION (With duplicate section name validation)
    // ------------------------------------------------------------------------
    if (action === "upsert_section") {
      const parsed = UpsertSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid section data provided." },
          { status: 400 },
        );
      }

      const { countryCode, name, id } = parsed.data;
      const trimmedName = name.trim();

      const country = await prisma.country.findUnique({
        where: { code: countryCode },
      });
      if (!country) {
        return NextResponse.json(
          { error: "Country not found." },
          { status: 404 },
        );
      }

      const existingDuplicate = await prisma.configSection.findFirst({
        where: {
          countryId: country.id,
          name: { equals: trimmedName, mode: "insensitive" },
          ...(id ? { NOT: { id } } : {}),
        },
      });

      if (existingDuplicate) {
        return NextResponse.json(
          {
            error: `A section named "${trimmedName}" already exists for ${country.name} (${country.code}). Please choose a different name.`,
          },
          { status: 409 },
        );
      }

      let section;
      if (id) {
        section = await prisma.configSection.update({
          where: { id },
          data: { name: trimmedName },
        });
      } else {
        const count = await prisma.configSection.count({
          where: { countryId: country.id },
        });
        section = await prisma.configSection.create({
          data: { countryId: country.id, name: trimmedName, sortOrder: count },
        });
      }

      return NextResponse.json({ success: true, section });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: UPSERT QUESTION
    // ------------------------------------------------------------------------
    if (action === "upsert_question") {
      const parsed = UpsertQuestionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.format() },
          { status: 400 },
        );
      }

      const qData = parsed.data;

      const sectionRecord = await prisma.configSection.findUnique({
        where: { id: qData.sectionId },
        include: {
          questions: {
            where: { isArchived: false },
            include: { answers: { where: { isArchived: false } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!sectionRecord) {
        return NextResponse.json(
          { error: "Section not found." },
          { status: 404 },
        );
      }

      const nodes: SectionQuestionNode[] = sectionRecord.questions.map((q) => ({
        id: q.id,
        label: q.label,
        answerType: q.answerType,
        sortOrder: q.sortOrder,
        isArchived: q.isArchived,
        conditionJson: q.conditionJson as any,
        answers: q.answers.map((a) => ({
          id: a.id,
          label: a.label,
          isArchived: a.isArchived,
          conditionJson: a.conditionJson as any,
        })),
      }));

      const targetSortOrder = qData.id
        ? (nodes.find((n) => n.id === qData.id)?.sortOrder ?? nodes.length)
        : nodes.length;

      const precedenceCheck = validateConditionPrecedence(
        nodes,
        qData.id,
        targetSortOrder,
        qData.conditionJson,
        qData.answers.map((a) => a.conditionJson),
      );

      if (!precedenceCheck.valid) {
        return NextResponse.json(
          { error: precedenceCheck.error },
          { status: 400 },
        );
      }

      const savedQuestion = await prisma.$transaction(async (tx) => {
        let questionId = qData.id;

        if (questionId) {
          await tx.configQuestion.update({
            where: { id: questionId },
            data: {
              label: qData.label,
              displayAs: qData.displayAs,
              answerType: qData.answerType,
              isRequired: qData.isRequired,
              confirmAiValue: qData.confirmAiValue,
              preFilledText: qData.preFilledText,
              conditionJson: qData.conditionJson as any,
              updatedBy: qData.updatedBy,
              updatedAt: new Date(),
            },
          });
        } else {
          const newQ = await tx.configQuestion.create({
            data: {
              sectionId: qData.sectionId,
              label: qData.label,
              displayAs: qData.displayAs,
              answerType: qData.answerType,
              isRequired: qData.isRequired,
              confirmAiValue: qData.confirmAiValue,
              preFilledText: qData.preFilledText,
              conditionJson: qData.conditionJson as any,
              sortOrder: targetSortOrder,
              updatedBy: qData.updatedBy,
            },
          });
          questionId = newQ.id;
        }

        // Synchronize answer options (Clean delete & recreate to prevent stacking duplicates)
        await tx.configAnswer.deleteMany({
          where: { questionId },
        });

        for (let i = 0; i < qData.answers.length; i++) {
          const ans = qData.answers[i];
          await tx.configAnswer.create({
            data: {
              questionId: questionId!,
              label: ans.label,
              isPreFilled: ans.isPreFilled,
              isLocked: ans.isLocked,
              conditionJson: ans.conditionJson as any,
              sortOrder: i,
            },
          });
        }

        return tx.configQuestion.findUnique({
          where: { id: questionId },
          include: { answers: { orderBy: { sortOrder: "asc" } } },
        });
      });

      return NextResponse.json({ success: true, question: savedQuestion });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: REORDER QUESTIONS
    // ------------------------------------------------------------------------
    if (action === "reorder_questions") {
      const { sectionId, orderedQuestionIds } = body;
      if (!sectionId || !Array.isArray(orderedQuestionIds)) {
        return NextResponse.json(
          { error: "Invalid reorder payload." },
          { status: 400 },
        );
      }

      const sectionRecord = await prisma.configSection.findUnique({
        where: { id: sectionId },
        include: {
          questions: {
            where: { isArchived: false },
            include: { answers: { where: { isArchived: false } } },
          },
        },
      });

      if (!sectionRecord) {
        return NextResponse.json(
          { error: "Section not found." },
          { status: 404 },
        );
      }

      const nodes: SectionQuestionNode[] = sectionRecord.questions.map((q) => ({
        id: q.id,
        label: q.label,
        answerType: q.answerType,
        sortOrder: q.sortOrder,
        isArchived: q.isArchived,
        conditionJson: q.conditionJson as any,
        answers: q.answers.map((a) => ({
          id: a.id,
          label: a.label,
          isArchived: a.isArchived,
          conditionJson: a.conditionJson as any,
        })),
      }));

      const reorderCheck = validateQuestionReorder(nodes, orderedQuestionIds);
      if (!reorderCheck.valid) {
        return NextResponse.json(
          { error: reorderCheck.error },
          { status: 400 },
        );
      }

      await prisma.$transaction(
        orderedQuestionIds.map((id: number, index: number) =>
          prisma.configQuestion.update({
            where: { id },
            data: { sortOrder: index, updatedAt: new Date() },
          }),
        ),
      );

      return NextResponse.json({
        success: true,
        message: "Questions reordered successfully.",
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: ARCHIVE / RESTORE SECTION
    // ------------------------------------------------------------------------
    if (action === "archive_section") {
      const { sectionId, isArchived } = body;
      if (!sectionId) {
        return NextResponse.json(
          { error: "Missing sectionId." },
          { status: 400 },
        );
      }

      const updatedSection = await prisma.configSection.update({
        where: { id: Number(sectionId) },
        data: {
          isArchived: isArchived !== undefined ? Boolean(isArchived) : true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, section: updatedSection });
    }

    // ------------------------------------------------------------------------
    // ACTION 5: ARCHIVE / RESTORE QUESTION
    // ------------------------------------------------------------------------
    if (action === "archive_question") {
      const { questionId, isArchived } = body;
      if (!questionId) {
        return NextResponse.json(
          { error: "Missing questionId." },
          { status: 400 },
        );
      }

      const updatedQuestion = await prisma.configQuestion.update({
        where: { id: Number(questionId) },
        data: {
          isArchived: isArchived !== undefined ? Boolean(isArchived) : true,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, question: updatedQuestion });
    }

    // ------------------------------------------------------------------------
    // ACTION 6: SUBMIT CANDIDATE RESPONSES (OVERWRITE & SANITIZE JSONB)
    // ------------------------------------------------------------------------
    if (action === "submit_candidate") {
      const numericUserId = Number(body.userId);
      const countryCode = String(body.countryCode || "PT")
        .trim()
        .toUpperCase();
      const rawAnswers =
        body.answers && typeof body.answers === "object" ? body.answers : {};

      if (!numericUserId || !countryCode) {
        return NextResponse.json(
          { error: "Missing valid userId or countryCode." },
          { status: 400 },
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: numericUserId },
      });

      if (!user) {
        return NextResponse.json(
          { error: `Candidate user with ID ${numericUserId} not found.` },
          { status: 404 },
        );
      }

      const country = await prisma.country.findUnique({
        where: { code: countryCode },
        include: {
          sections: {
            where: { isArchived: false },
            include: {
              questions: {
                where: { isArchived: false },
                include: {
                  answers: {
                    where: { isArchived: false },
                  },
                },
              },
            },
          },
        },
      });

      if (!country) {
        return NextResponse.json(
          { error: `Country ${countryCode} not found.` },
          { status: 404 },
        );
      }

      // Build map of currently active questions by label for strict sanitization
      const activeQuestionsByLabel = new Map<
        string,
        {
          answerType: string;
          displayAs: string;
          validLabels: Set<string>;
        }
      >();

      for (const sec of country.sections) {
        for (const q of sec.questions) {
          activeQuestionsByLabel.set(q.label, {
            answerType: q.answerType,
            displayAs: q.displayAs,
            validLabels: new Set(q.answers.map((a) => a.label)),
          });
        }
      }

      // Strictly filter incoming answers: drop archived/unknown questions and dead option labels
      const sanitizedResponses: Record<string, any> = {};

      for (const [questionLabel, submittedVal] of Object.entries(rawAnswers)) {
        const qMeta = activeQuestionsByLabel.get(questionLabel);
        if (!qMeta) continue; // Ignore questions that don't exist or are archived

        if (
          submittedVal === undefined ||
          submittedVal === null ||
          submittedVal === ""
        ) {
          continue;
        }

        if (qMeta.displayAs === "text" || qMeta.answerType === "text") {
          sanitizedResponses[questionLabel] = String(submittedVal).trim();
        } else if (
          qMeta.answerType === "multi" &&
          Array.isArray(submittedVal)
        ) {
          const cleanList = submittedVal.filter(
            (item) => typeof item === "string" && qMeta.validLabels.has(item),
          );
          if (cleanList.length > 0) {
            sanitizedResponses[questionLabel] = cleanList;
          }
        } else if (
          qMeta.answerType === "single" ||
          qMeta.answerType === "bool"
        ) {
          const strVal = String(submittedVal);
          if (qMeta.validLabels.has(strVal)) {
            sanitizedResponses[questionLabel] = strVal;
          }
        }
      }

      // Completely overwrite customData so zero stale keys or old array items survive
      const freshCustomData = {
        countryCode,
        applicationResponses: sanitizedResponses,
        lastSubmittedAt: new Date().toISOString(),
      };

      if (user.countryId !== country.id) {
        await prisma.user.update({
          where: { id: numericUserId },
          data: {
            countryId: country.id,
            updatedAt: new Date(),
          },
        });
      }

      const savedMetadata = await prisma.userMetadata.upsert({
        where: { userId: numericUserId },
        update: {
          customData: freshCustomData,
          updatedAt: new Date(),
        },
        create: {
          userId: numericUserId,
          customData: freshCustomData,
        },
      });

      return NextResponse.json({
        success: true,
        metadata: savedMetadata,
      });
    }

    return NextResponse.json(
      { error: "Invalid action type." },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("POST Admin Config Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A record with this name already exists for this country. Please use a unique name.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
