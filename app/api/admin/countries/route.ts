import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/**
 * ============================================================================
 * GET /api/admin/countries
 * ============================================================================
 * Purpose: Fetch all available countries from the DB for dynamic dropdowns.
 * ============================================================================
 */
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, countries });
  } catch (error: any) {
    console.error("❌ GET Countries Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
