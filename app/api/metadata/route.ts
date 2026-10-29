import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

/**
 * ============================================================================
 * POST /api/metadata
 * ============================================================================
 * Purpose: Persists unstructured JSONB metadata for an existing User record.
 * Architectural Note: Enforces referential integrity by verifying that the
 * target User exists before upserting UserMetadata.
 * ============================================================================
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, customData } = body;

    // 1. Validate email presence and @ symbol constraint
    if (!email || !String(email).includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email containing an @ symbol." },
        { status: 400 },
      );
    }

    const validEmail = String(email).trim().toLowerCase();

    // 2. Lookup parent User record by email
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

    // 3. Upsert JSONB metadata record linked via integer surrogate key (userId)
    const now = new Date();

    const metadata = await prisma.userMetadata.upsert({
      where: { userId: existingUser.id },
      create: {
        userId: existingUser.id,
        customData: customData || {},
        updatedAt: null,
      },
      update: {
        customData: customData || {},
        updatedAt: now,
      },
    });

    return NextResponse.json({ success: true, metadata });
  } catch (error: any) {
    console.error("CRITICAL: Metadata POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save metadata." },
      { status: 500 },
    );
  }
}
