import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

// 1. Strict and defensive interface (.NET style)
interface CheckResultsRequestBody {
    email?: unknown;
}

const checkResultsSchema = z.object({
    email: z.email("Invalid email format.")
});

export async function POST(request: Request) {
    try {
        const body: CheckResultsRequestBody = await request.json();
        
        // 2. Explicitly enforce string conversion (.NET style casting)
        const rawEmail = body.email;
        const emailString = rawEmail !== null && rawEmail !== undefined ? String(rawEmail) : '';

        // 3. Zod validation acting on the sanitized string
        const validation = checkResultsSchema.safeParse({
            email: emailString
        });
        
        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { email } = validation.data;
        const sanitizedEmail = email.trim().toLowerCase();

        // 4. Critical Database Execution (Calling the Stored Function)
        try {
            const result = await prisma.$queryRaw<any[]>`
                SELECT * FROM get_full_user_summary(${sanitizedEmail})
            `;

            if (!result || result.length === 0) {
                return NextResponse.json({ found: false, message: 'No record found for this email.' });
            }

            return NextResponse.json({ 
                found: true, 
                data: result[0] 
            });
            
        } catch (dbError) {
            console.error('CRITICAL: Failed to execute user summary procedure:', dbError);
            return NextResponse.json(
                { error: 'Error: Error querying database. Please call the developer.' },
                { status: 500 }
            );
        }
    } catch (error) {
        // Handle unexpected request JSON parsing errors
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}