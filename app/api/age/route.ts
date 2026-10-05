import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

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

interface AgeRequestBody {
  birthDate?: unknown;
  momBirthDate?: unknown;
  dadBirthDate?: unknown;
}

export async function POST(request: Request) {
  const { birthDate, momBirthDate, dadBirthDate } : AgeRequestBody = await request.json();

  // 1. User Validation (Mandatory)
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

  // 2. Mother Validation (Optional)
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

  // 3. Father Validation (Optional)
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

  // 4. Critical Database Insertion & Final Response
  try {
    await prisma.ageRecord.create({
      data: {
        birthDate: stringBirthDate,
        momDate: (momBirthDate && stringMomDate.trim() !== '') ? stringMomDate : null,
        dadDate: (dadBirthDate && stringDadDate.trim() !== '') ? stringDadDate : null,
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
}