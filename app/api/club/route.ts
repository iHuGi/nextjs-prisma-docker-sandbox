import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

/**
 * ============================================================================
 * POST /api/club
 * ============================================================================
 * Purpose: Validates and persists a user's club affiliation record.
 * Architectural Note: Does not implicitly create parent User records. The
 * user profile must already exist in the master User table prior to submission.
 * ============================================================================
 */

// 1. Strict and defensive request payload contract (.NET style)
interface ClubRequestBody {
  club?: unknown;
  email?: unknown;
  description?: unknown;
}

// 2. Validation schema enforcing @ presence and non-empty club name
const clubRequestSchema = z.object({
  email: z.string().refine((val) => val.includes("@"), {
    message: "Invalid email format. Email must contain an @ symbol.",
  }),
  club: z.string().min(1, "Please enter a valid club name."),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body: ClubRequestBody = await request.json();

    // 3. Explicitly enforce string casting to prevent runtime type coercion issues
    const rawClub = body.club;
    const rawEmail = body.email;
    const rawDescription = body.description;

    const clubString =
      rawClub !== null && rawClub !== undefined ? String(rawClub) : "";
    const emailString =
      rawEmail !== null && rawEmail !== undefined ? String(rawEmail) : "";
    const rawDescriptionString =
      rawDescription !== null && rawDescription !== undefined
        ? String(rawDescription)
        : "";

    // 4. Execute Zod schema validation on sanitized string primitives
    const validation = clubRequestSchema.safeParse({
      email: emailString,
      club: clubString,
      description: rawDescriptionString,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, club, description } = validation.data;
    const validEmail = email.trim().toLowerCase();
    const sanitizedClub = club.trim();
    const sanitizedDescription = description?.trim() || null;
    const clubLower = sanitizedClub.toLowerCase();
    let message = "";

    // 5. Evaluate domain business rules for club selection
    if (clubLower === "sporting") {
      message = "Excellent taste, lion!";
    } else if (clubLower === "porto" || clubLower === "benfica") {
      message = "Bad taste bro... that's rough!";
    } else {
      message = `${sanitizedClub}? Well, could be worse.`;
    }

    // 6. Verify parent User record existence (no silent/implicit user creation)
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

    // 7. Atomic transaction: update parent audit timestamp and upsert ClubRecord
    const now = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        // Step A: Update parent User modification timestamp
        await tx.user.update({
          where: { id: existingUser.id },
          data: { updatedAt: now },
        });

        // Step B: Upsert child ClubRecord linked via surrogate key (userId)
        await tx.clubRecord.upsert({
          where: { userId: existingUser.id },
          create: {
            userId: existingUser.id,
            name: sanitizedClub,
            description: sanitizedDescription,
            updatedAt: null,
          },
          update: {
            name: sanitizedClub,
            description: sanitizedDescription,
            updatedAt: now,
          },
        });
      });

      return NextResponse.json({ message });
    } catch (dbError) {
      console.error(
        "CRITICAL: Failed to write club record to database:",
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
    // Handle unexpected request JSON parsing or unhandled runtime exceptions
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
