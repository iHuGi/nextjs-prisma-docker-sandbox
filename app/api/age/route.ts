import { NextResponse } from 'next/server';

// Define a strict interface for the incoming request body
interface AgeRequestBody {
  birthDate?: unknown;
}

export async function POST(request: Request) {
  try {
    const body: AgeRequestBody = await request.json();
    
    // Explicitly enforce string conversion and safety checks (.NET style)
    const rawBirthDate = body.birthDate;
    const birthDateString = rawBirthDate !== null && rawBirthDate !== undefined ? String(rawBirthDate) : '';

    // Validate input presence
    if (!birthDateString) {
      return NextResponse.json({ error: 'Birth date is required.' }, { status: 400 });
    }

    const birth = new Date(birthDateString);
    
    // Validate date format
    if (isNaN(birth.getTime())) {
      return NextResponse.json({ error: 'Invalid date format.' }, { status: 400 });
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // Adjust age if the birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    // Validate age bounds
    if (age < 0 || age > 120) {
      return NextResponse.json({ error: 'Please provide a realistic birth date.' }, { status: 400 });
    }

    // Success response
    return NextResponse.json({ 
      message: `Hello World! You are ${age} years old.` 
    });
  } catch (error) {
    // Handle unexpected server errors
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}