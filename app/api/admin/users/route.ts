import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * ============================================================================
 * GET /api/admin/users
 * ============================================================================
 * Purpose: Fetch all registered users for admin / candidate simulators.
 * Serializes BigInt fields to strings to prevent JSON serialization errors.
 * ============================================================================
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        country: true,
      },
      orderBy: { id: "asc" },
    });

    // Safely serialize BigInt fields to strings for JSON transport
    const serializedUsers = users.map((u) => ({
      ...u,
      identificationNumber: u.identificationNumber.toString(),
      phoneNumber: u.phoneNumber.toString(),
    }));

    return NextResponse.json({ success: true, users: serializedUsers });
  } catch (error: any) {
    console.error("❌ GET Users Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
