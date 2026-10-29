import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

/**
 * ============================================================================
 * GET & POST /api/users
 * ============================================================================
 * Purpose: Master controller for User entity management.
 * - GET: Retrieves all registered users along with their Country relation.
 * - POST: Upserts a User profile keyed by unique email address. Enforces
 *         integer/bigint constraints on identificationNumber and phoneNumber.
 * ============================================================================
 */

// 1. Defensive request payload interface
interface UserRequestBody {
  email?: unknown;
  identificationNumber?: unknown;
  phoneNumber?: unknown;
  countryId?: unknown;
}

// 2. Zod validation schema enforcing @ symbol and numeric integer strings
const userUpsertSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .refine((val) => val.includes("@"), {
      message: "Invalid email format. Email must contain an @ symbol.",
    }),
  identificationNumber: z
    .string()
    .min(1, "Identification number is required.")
    .refine((val) => /^\d+$/.test(val), {
      message: "Identification number must be a valid integer (digits only).",
    }),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required.")
    .refine((val) => /^\d+$/.test(val), {
      message: "Phone number must be a valid integer (digits only).",
    }),
  countryId: z.coerce
    .number()
    .int("Country ID must be a valid integer.")
    .positive("Country selection is mandatory."),
});

/**
 * GET /api/users
 * Returns all registered users ordered by ID ascending.
 * Note: BigInt columns are serialized to strings to comply with JSON standards.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        country: true,
      },
      orderBy: { id: "asc" },
    });

    const serializedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      identificationNumber: u.identificationNumber.toString(),
      phoneNumber: u.phoneNumber.toString(),
      countryId: u.countryId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      country: u.country,
    }));

    return NextResponse.json({ success: true, users: serializedUsers });
  } catch (error: any) {
    console.error("CRITICAL: GET /api/users Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users from database." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users
 * Creates a new User record or updates an existing profile if the email matches.
 */
export async function POST(request: Request) {
  try {
    const body: UserRequestBody = await request.json();

    // 3. Explicit string casting prior to schema validation
    const emailString =
      body.email !== null && body.email !== undefined
        ? String(body.email).trim()
        : "";
    const idNumberString =
      body.identificationNumber !== null &&
      body.identificationNumber !== undefined
        ? String(body.identificationNumber).trim()
        : "";
    const phoneString =
      body.phoneNumber !== null && body.phoneNumber !== undefined
        ? String(body.phoneNumber).trim()
        : "";

    const validation = userUpsertSchema.safeParse({
      email: emailString,
      identificationNumber: idNumberString,
      phoneNumber: phoneString,
      countryId: body.countryId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, identificationNumber, phoneNumber, countryId } =
      validation.data;
    const validEmail = email.toLowerCase();

    // 4. Convert validated numeric strings to native 64-bit BigInt primitives
    const idBigInt = BigInt(identificationNumber);
    const phoneBigInt = BigInt(phoneNumber);

    // 5. Verify that the target Country record exists in the database
    const existingCountry = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!existingCountry) {
      return NextResponse.json(
        { error: "Selected country does not exist in the database." },
        { status: 404 },
      );
    }

    // 6. Upsert User record and return serialized entity
    const now = new Date();

    const upsertedUser = await prisma.user.upsert({
      where: { email: validEmail },
      create: {
        email: validEmail,
        identificationNumber: idBigInt,
        phoneNumber: phoneBigInt,
        countryId,
        updatedAt: null,
      },
      update: {
        identificationNumber: idBigInt,
        phoneNumber: phoneBigInt,
        countryId,
        updatedAt: now,
      },
      include: {
        country: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: upsertedUser.id,
        email: upsertedUser.email,
        identificationNumber: upsertedUser.identificationNumber.toString(),
        phoneNumber: upsertedUser.phoneNumber.toString(),
        countryId: upsertedUser.countryId,
        createdAt: upsertedUser.createdAt,
        updatedAt: upsertedUser.updatedAt,
        country: upsertedUser.country,
      },
    });
  } catch (error: any) {
    console.error("CRITICAL: POST /api/users Error:", error);
    return NextResponse.json(
      { error: error.message || "Error writing user record to database." },
      { status: 500 },
    );
  }
}
