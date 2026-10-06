import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

// Returns a number (int: age) or null if the date is invalid or in the future
function calculateAge(dateString: string) : number | null {
  if (!dateString) return null;

  const birthDate = new Date(dateString);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age > 120) {
    return null;
  }
  return age;
}

// Strict interface for the incoming request body (.NET style)
interface AgeRequestBody {
  email?: unknown;
  birthDate?: unknown;
  momBirthDate?: unknown;
  dadBirthDate?: unknown;
}

// Zod schema strictly for validating the email
const emailRequestSchema = z.object({
  email: z.string().email("Invalid email format.")
});

export async function POST(request: Request) {
  try {
    const body: AgeRequestBody = await request.json();
    const { email, birthDate, momBirthDate, dadBirthDate } = body;

    // 1. Zod Validation for Email
    const rawEmail = email;
    const emailString = rawEmail !== null && rawEmail !== undefined ? String(rawEmail) : '';
    
    const emailValidation = emailRequestSchema.safeParse({ email: emailString });
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: emailValidation.error.issues[0].message }, 
        { status: 400 }
      );
    }
    const validEmail = emailValidation.data.email;

    // 2. User Validation (Mandatory - Original Logic Intact)
    const stringBirthDate = String(birthDate);
    if (!birthDate || stringBirthDate === 'undefined' || stringBirthDate.trim() === '') {
      return NextResponse.json(
        { error: 'Please provide a valid birth date.' }, 
        { status: 400 }
      );
    }

    const userAge = calculateAge(stringBirthDate);
    if (userAge === null) {
      return NextResponse.json(
        { error: 'Error: Your birth date is invalid or exceeds biological limits.' },
        { status: 400 }
      );
    }

    let message = `You are ${userAge} years old.`;

    // 3. Mother Validation (Optional - Original Logic Intact)
    const stringMomDate = String(momBirthDate);
    if (momBirthDate && stringMomDate !== 'undefined' && stringMomDate.trim() !== '') {
      const momAge = calculateAge(stringMomDate);
      
      if (momAge === null) {
        return NextResponse.json(
          { error: 'Error: Mother\'s birth date is invalid or exceeds biological limits.' },
          { status: 400 }
        );
      }

      if (momAge < 16) {
        return NextResponse.json(
          { error: 'Error: Mother cannot be younger than 16 years old.' },
          { status: 400 }
        );
      }

      message += ` Your mother is ${momAge} years old.`;
    }

    // 4. Father Validation (Optional - Original Logic Intact)
    const stringDadDate = String(dadBirthDate);
    if (dadBirthDate && stringDadDate !== 'undefined' && stringDadDate.trim() !== '') {
      const dadAge = calculateAge(stringDadDate);
      
      if (dadAge === null) {
        return NextResponse.json(
          { error: 'Error: Father\'s birth date is invalid or exceeds biological limits.' },
          { status: 400 }
        );
      }

      if (dadAge < 16) {
        return NextResponse.json(
          { error: 'Error: Father cannot be younger than 16 years old.' },
          { status: 400 }
        );
      }
      
      message += ` Your father is ${dadAge} years old.`;
    }

    // 5. Critical Database Insertion (Upsert) & Final Response
    // Prisma expects JS Date objects for DateTime fields, so we instantiate new Date() here.
    const dbBirthDate = new Date(stringBirthDate);
    const dbMomDate = (momBirthDate && stringMomDate.trim() !== '') ? new Date(stringMomDate) : null;
    const dbDadDate = (dadBirthDate && stringDadDate.trim() !== '') ? new Date(stringDadDate) : null;

    try {
      await prisma.ageRecord.upsert({
        where: { email: validEmail },
        update: {
          birthDate: dbBirthDate,
          momDate: dbMomDate,
          dadDate: dbDadDate,
        },
        create: {
          email: validEmail,
          birthDate: dbBirthDate,
          momDate: dbMomDate,
          dadDate: dbDadDate,
        },
      });

      return NextResponse.json({ message });

    } catch (dbError) {
      console.error('CRITICAL: Failed to write age record to database:', dbError);
      return NextResponse.json(
        { error: 'Error: Error writing to database. Please call the developer.' },
        { status: 500 }
      );
    }
  } catch (error) {
    // Failsafe catch block for malformed JSON parsing
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}