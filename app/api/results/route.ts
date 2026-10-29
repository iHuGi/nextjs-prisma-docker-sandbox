import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { z } from "zod";

// 1. Raw Request Body Interface for single email lookup (.NET DTO style)
interface RawResultsRequestBody {
  email?: unknown;
}

// 2. Strict Zod Validation Schema for POST
const resultsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format.")),
});

// 3. Strongly-typed PostgreSQL Stored Function return structures
interface UserSummaryRow {
  user_id: number;
  email: string;
  birth_date: Date | null;
  mom_date: Date | null;
  dad_date: Date | null;
  club_name: string | null;
  club_description: string | null;
  custom_data: Record<string, unknown> | null;
  user_created_at: Date;
  user_updated_at: Date | null;
}

interface PaginatedUserRow extends UserSummaryRow {
  total_count: bigint | number;
}

/**
 * GET /api/results?page=1&limit=20
 * Calls PostgreSQL Stored Function get_paginated_users(p_limit, p_offset)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit =
      Number.isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
    const offset = (page - 1) * limit;

    const rows = await prisma.$queryRaw<PaginatedUserRow[]>`
      SELECT * FROM get_paginated_users(${limit}::INT, ${offset}::INT);
    `;

    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Strip the window function total_count from individual row objects before serializing
    const items = rows.map(({ total_count, ...user }) => user);

    return NextResponse.json({
      page,
      limit,
      totalCount,
      totalPages,
      items,
    });
  } catch (dbError) {
    console.error("CRITICAL: Failed to fetch paginated users:", dbError);
    return NextResponse.json(
      { error: "Error fetching paginated records from database." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/results
 * Calls PostgreSQL Stored Function get_full_user_summary(p_email)
 */
export async function POST(request: Request) {
  try {
    const body: RawResultsRequestBody = await request.json();

    const validation = resultsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    try {
      const result = await prisma.$queryRaw<UserSummaryRow[]>`
        SELECT * FROM get_full_user_summary(${email});
      `;

      if (!result || result.length === 0) {
        return NextResponse.json(
          {
            found: false,
            message: "No records found for this email across any table.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        found: true,
        data: result[0],
      });
    } catch (dbError) {
      console.error("CRITICAL: Failed to execute stored function:", dbError);
      return NextResponse.json(
        {
          error:
            "Error: Error querying database procedure. Please call the developer.",
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
