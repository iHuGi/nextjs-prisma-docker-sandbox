import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        country: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("❌ GET Users Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
