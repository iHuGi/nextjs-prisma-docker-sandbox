import { NextResponse } from 'next/server';

// Define a strict interface for the incoming request body
interface ClubRequestBody {
  club?: unknown;
}

export async function POST(request: Request) {
  try {
    const body: ClubRequestBody = await request.json();
    
    // Explicitly enforce string conversion and validation (.NET style)
    const rawClub = body.club;
    const clubString = rawClub !== null && rawClub !== undefined ? String(rawClub) : '';

    if (!clubString || clubString.trim() === '') {
      return NextResponse.json({ error: 'Please enter a valid club name.' }, { status: 400 });
    }

    const clubLower = clubString.trim().toLowerCase();
    let message = '';

    // Determine response based on the club
    if (clubLower === 'sporting') {
      message = 'Excellent taste, lion! 🦁💚';
    } else if (clubLower === 'porto' || clubLower === 'benfica') {
      message = 'Bad taste bro... that\'s rough! 🤦‍♂️';
    } else {
      message = `${clubString.trim()}? Well, could be worse.`;
    }

    // Success response
    return NextResponse.json({ message });
  } catch (error) {
    // Handle unexpected server errors
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}