import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  DynamicMetadataPayloadSchema,
  validateAndMergeCandidateAdditionalInfo,
  RuntimeQuestionConfig,
} from "../../../lib/validations/dynamicCandidate.validator";

/**
 * ============================================================================
 * POST /api/candidates/additional-info
 * ============================================================================
 * Purpose:
 * Validates and saves candidate 'additionalInfo' answers against the active 3NF
 * country configuration at runtime, enforcing conditional visibility (BR21),
 * required fields, and AI value confirmation states (BR27).
 * ============================================================================
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate incoming payload structure using Zod
    const parsed = DynamicMetadataPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { email, countryCode, additionalInfo = {} } = parsed.data;

    // 2. Find target candidate user and their bound country/metadata
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        country: true,
        metadata: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Candidate with email '${email}' not found.` },
        { status: 404 },
      );
    }

    // 3. Resolve target country (payload countryCode overrides user's default binding)
    let targetCountryId = user.countryId;
    let effectiveCountryCode = user.country?.code;

    if (countryCode) {
      const cRecord = await prisma.country.findUnique({
        where: { code: countryCode },
      });
      if (cRecord) {
        targetCountryId = cRecord.id;
        effectiveCountryCode = cRecord.code;
      }
    }

    if (!effectiveCountryCode) {
      return NextResponse.json(
        {
          error:
            "Candidate has no country assigned and no countryCode was provided.",
        },
        { status: 400 },
      );
    }

    // 4. Fetch active country configuration questions and answers from normalized 3NF tables
    const sections = await prisma.configSection.findMany({
      where: { countryId: targetCountryId!, isArchived: false },
      include: {
        questions: {
          where: { isArchived: false },
          orderBy: { sortOrder: "asc" },
          include: {
            answers: {
              where: { isArchived: false },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    // Flatten into runtime node configs for the validation engine
    const activeQuestions: RuntimeQuestionConfig[] = sections.flatMap((sec) =>
      sec.questions.map((q) => ({
        id: q.id,
        label: q.label,
        displayAs: q.displayAs,
        answerType: q.answerType,
        isRequired: q.isRequired,
        confirmAiValue: q.confirmAiValue,
        isArchived: q.isArchived,
        conditionJson: q.conditionJson as any,
        answers: q.answers.map((a) => ({
          id: a.id,
          label: a.label,
          isArchived: a.isArchived,
          conditionJson: a.conditionJson as any,
        })),
      })),
    );

    // 5. Retrieve existing stored additionalInfo from UserMetadata JSONB column
    const existingMetadata = (user.metadata?.customData as any) || {};
    const existingAdditionalInfo = existingMetadata.additionalInfo || {};

    // 6. Run runtime validation and merge engine (BR21, BR27, BR28)
    const validationResult = validateAndMergeCandidateAdditionalInfo(
      activeQuestions,
      existingAdditionalInfo,
      additionalInfo,
    );

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          errors: validationResult.errors,
        },
        { status: 400 },
      );
    }

    // 7. Construct updated JSONB payload preserving flat customData properties
    const updatedCustomData = {
      ...existingMetadata,
      additionalInfo: validationResult.mergedAdditionalInfo,
    };

    // 8. Persist changes atomically in the database
    await prisma.$transaction(async (tx) => {
      // Update user country binding if it changed
      if (targetCountryId && user.countryId !== targetCountryId) {
        await tx.user.update({
          where: { id: user.id },
          data: { countryId: targetCountryId, updatedAt: new Date() },
        });
      }

      // Upsert UserMetadata JSONB record
      if (user.metadata) {
        await tx.userMetadata.update({
          where: { userId: user.id },
          data: {
            customData: updatedCustomData,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.userMetadata.create({
          data: {
            userId: user.id,
            customData: updatedCustomData,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Additional info validated and saved successfully.",
      additionalInfo: validationResult.mergedAdditionalInfo,
    });
  } catch (error: any) {
    console.error("❌ POST Candidate Additional Info Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
