import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

// 1. Strict and defensive interface (.NET style)
interface ClubRequestBody {
  club?: unknown;
  email?: unknown;
}

const clubRequestSchema = z.object({
  email: z.string().email("Invalid email format."),
  club: z.string().min(1, "Please enter a valid club name.")
});

export async function POST(request: Request) {
  try {
    const body: ClubRequestBody = await request.json();
    
    // 2. Explicitly enforce string conversion (.NET style casting)
    const rawClub = body.club;
    const rawEmail = body.email;
    
    const clubString = rawClub !== null && rawClub !== undefined ? String(rawClub) : '';
    const emailString = rawEmail !== null && rawEmail !== undefined ? String(rawEmail) : '';

    // 3. Zod validation acting on the sanitized strings
    const validation = clubRequestSchema.safeParse({
      email: emailString,
      club: clubString
    });
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { email, club } = validation.data;
    const clubLower = club.trim().toLowerCase();
    let message = '';

    // 4. Core business logic
    if (clubLower === 'sporting') {
      message = 'Excellent taste, lion!';
    } else if (clubLower === 'porto' || clubLower === 'benfica') {
      message = 'Bad taste bro... that\'s rough!';
    } else {
      message = `${club.trim()}? Well, could be worse.`;
    }

    // 5. Critical Database Insertion (Upsert)
    try {
      await prisma.clubRecord.upsert({
        where: { email: email },
        update: { name: club.trim() },
        create: {
          email: email,
          name: club.trim(), // The database column is mapped to 'name'
        },
      });

      return NextResponse.json({ message });
      
    } catch (dbError) {
      console.error('CRITICAL: Failed to write club record to database:', dbError);
      return NextResponse.json(
        { error: 'Error: Error writing to database. Please call the developer.' },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle unexpected request JSON parsing errors
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}