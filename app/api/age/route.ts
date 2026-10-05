import { NextResponse } from 'next/server';

// Returns a number (int: age) or null if the date is invalid or in the future
function calculateAge(dateString: string) : number | null {
  if (!dateString) return null; // Handle empty string case

  const birthDate = new Date(dateString);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return null; // Invalid date or future date
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth(); // Adjusted for month difference

  // if the birth month hasn't occurred yet this year,
  // or it's the birth month but the day hasn't occurred yet, subtract one from age
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age > 120) {
    return null; // Age is outside the valid range
  }
  return age;
}

// Define a strict interface for the incoming request body
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

  // Start building the dynamic message
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

    // Append to message if valid
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

  // Return the fully constructed string
  return NextResponse.json({ message });
}