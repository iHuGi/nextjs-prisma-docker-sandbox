import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

/**
 * ============================================================================
 * POST /api/age
 * ============================================================================
 * Purpose: Validates biological age constraints and persists an AgeRecord.
 * Architectural Note: Requires an existing parent User record in the database.
 * Implicit user creation is strictly disabled.
 * ============================================================================
 */

/**
 * Helper: Computes chronological age in years from an ISO date string.
 * Returns null if the date is malformed, in the future, or exceeds 120 years.
 */
function calculateAge(dateString: string): number | null {
  if (!dateString) return null;

  const birthDate = new Date(dateString);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  if (age > 120) {
    return null;
  }
  return age;
}

// 1. Defensive request body contract
interface AgeRequestBody {
  email?: unknown;
  birthDate?: unknown;
  momBirthDate?: unknown;
  dadBirthDate?: unknown;
}

// 2. Email validation schema requiring @ symbol
const emailRequestSchema = z.object({
  email: z.string().refine((val) => val.includes("@"), {
    message: "Invalid email format. Email must contain an @ symbol.",
  }),
});

export async function POST(request: Request) {
  try {
    const body: AgeRequestBody = await request.json();
    const { email, birthDate, momBirthDate, dadBirthDate } = body;

    // 3. Sanitize and validate email parameter
    const rawEmail = email;
    const emailString =
      rawEmail !== null && rawEmail !== undefined ? String(rawEmail) : "";

    const emailValidation = emailRequestSchema.safeParse({
      email: emailString,
    });
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: emailValidation.error.issues[0].message },
        { status: 400 },
      );
    }
    const validEmail = emailValidation.data.email.trim().toLowerCase();

    // 4. Validate primary candidate birth date
    const stringBirthDate = String(birthDate);
    if (
      !birthDate ||
      stringBirthDate === "undefined" ||
      stringBirthDate.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Please provide a valid birth date." },
        { status: 400 },
      );
    }

    const userAge = calculateAge(stringBirthDate);
    if (userAge === null) {
      return NextResponse.json(
        {
          error:
            "Error: Your birth date is invalid or exceeds biological limits.",
        },
        { status: 400 },
      );
    }

    let message = `You are ${userAge} years old.`;

    // 5. Validate optional mother's birth date
    const stringMomDate =
      momBirthDate !== null && momBirthDate !== undefined
        ? String(momBirthDate).trim()
        : "";
    if (stringMomDate !== "" && stringMomDate !== "undefined") {
      const momAge = calculateAge(stringMomDate);

      if (momAge === null) {
        return NextResponse.json(
          {
            error:
              "Error: Mother's birth date is invalid or exceeds biological limits.",
          },
          { status: 400 },
        );
      }

      if (momAge < 16) {
        return NextResponse.json(
          { error: "Error: Mother cannot be younger than 16 years old." },
          { status: 400 },
        );
      }

      message += ` Your mother is ${momAge} years old.`;
    }

    // 6. Validate optional father's birth date
    const stringDadDate =
      dadBirthDate !== null && dadBirthDate !== undefined
        ? String(dadBirthDate).trim()
        : "";
    if (stringDadDate !== "" && stringDadDate !== "undefined") {
      const dadAge = calculateAge(stringDadDate);

      if (dadAge === null) {
        return NextResponse.json(
          {
            error:
              "Error: Father's birth date is invalid or exceeds biological limits.",
          },
          { status: 400 },
        );
      }

      if (dadAge < 16) {
        return NextResponse.json(
          { error: "Error: Father cannot be younger than 16 years old." },
          { status: 400 },
        );
      }

      message += ` Your father is ${dadAge} years old.`;
    }

    // 7. Verify parent User record existence prior to persistence
    const existingUser = await prisma.user.findUnique({
      where: { email: validEmail },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "User profile not found for this email. Please select a valid user or consult existing profiles in the Users menu.",
        },
        { status: 404 },
      );
    }

    const dbBirthDate = new Date(stringBirthDate);
    const dbMomDate =
      stringMomDate !== "" && stringMomDate !== "undefined"
        ? new Date(stringMomDate)
        : null;
    const dbDadDate =
      stringDadDate !== "" && stringDadDate !== "undefined"
        ? new Date(stringDadDate)
        : null;
    const now = new Date();

    // 8. Atomic transaction: update parent User timestamp and upsert AgeRecord
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { updatedAt: now },
        });

        await tx.ageRecord.upsert({
          where: { userId: existingUser.id },
          create: {
            userId: existingUser.id,
            birthDate: dbBirthDate,
            momDate: dbMomDate,
            dadDate: dbDadDate,
            updatedAt: null,
          },
          update: {
            birthDate: dbBirthDate,
            momDate: dbMomDate,
            dadDate: dbDadDate,
            updatedAt: now,
          },
        });
      });

      return NextResponse.json({ message });
    } catch (dbError) {
      console.error(
        "CRITICAL: Failed to write age record to database:",
        dbError,
      );
      return NextResponse.json(
        {
          error: "Error: Error writing to database. Please call the developer.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
