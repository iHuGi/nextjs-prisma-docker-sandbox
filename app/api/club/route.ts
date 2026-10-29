import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

// 1. Strict and defensive interface (.NET style)
interface ClubRequestBody {
  club?: unknown;
  email?: unknown;
  description?: unknown;
}

const clubRequestSchema = z.object({
  email: z.email("Invalid email format."),
  club: z.string().min(1, "Please enter a valid club name."),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body: ClubRequestBody = await request.json();

    // 2. Explicitly enforce string conversion (.NET style casting)
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

    // 3. Zod validation acting on the sanitized strings
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

    // 4. Core business logic
    if (clubLower === "sporting") {
      message = "Excellent taste, lion!";
    } else if (clubLower === "porto" || clubLower === "benfica") {
      message = "Bad taste bro... that's rough!";
    } else {
      message = `${sanitizedClub}? Well, could be worse.`;
    }

    // 5. Critical Database Insertion (Normalized User + ClubRecord Upsert)
    const now = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        // Step A: Upsert parent User record (sets updatedAt only on update)
        const user = await tx.user.upsert({
          where: { email: validEmail },
          create: {
            email: validEmail,
            updatedAt: null,
          },
          update: {
            updatedAt: now,
          },
        });

        // Step B: Upsert child ClubRecord linked via integer surrogate key (userId)
        await tx.clubRecord.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
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
    // Handle unexpected request JSON parsing errors
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
