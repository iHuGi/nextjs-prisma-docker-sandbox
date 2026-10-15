import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as submitAge } from '../app/api/age/route';
import { POST as submitClub } from '../app/api/club/route';
import { POST as fetchResults } from '../app/api/results/route';
import { prisma } from '../app/lib/prisma';

// Run it from the command line via: npm run test
const TEST_EMAIL = 'john.doe.integration@gmail.com';

describe('API Integration Tests - Real PostgreSQL DB', () => {

    /**
     * Purge pre-existing test state to ensure complete test isolation.
     */
    beforeAll(async () => {
        await prisma.ageRecord.deleteMany({ where: { email: TEST_EMAIL } });
        await prisma.clubRecord.deleteMany({ where: { email: TEST_EMAIL } });
    });

    /**
     * Teardown routine: purge test records and gracefully disconnect Prisma Client.
     */
    afterAll(async () => {
        await prisma.ageRecord.deleteMany({ where: { email: TEST_EMAIL } });
        await prisma.clubRecord.deleteMany({ where: { email: TEST_EMAIL } });
        await prisma.$disconnect();
    });

    it('Should insert/update AgeRecord via /api/age and verify in PostgreSQL', async () => {
        const req = new Request('http://localhost:3000/api/age', {
            method: 'POST',
            body: JSON.stringify({
                email: TEST_EMAIL,
                birthDate: '1991-08-02',
                momBirthDate: '1965-04-13',
                dadBirthDate: '1960-08-02'
            })
        });

        const res = await submitAge(req);
        expect(res.status).toBe(200);

        // Direct database assertion against real PostgreSQL instance
        const dbRecord = await prisma.ageRecord.findUnique({ where: { email: TEST_EMAIL } });
        expect(dbRecord).not.toBeNull();
        expect(dbRecord?.email).toBe(TEST_EMAIL);
    });

    it('Should insert/update ClubRecord via /api/club and verify in PostgreSQL', async () => {
        const req = new Request('http://localhost:3000/api/club', {
            method: 'POST',
            body: JSON.stringify({
                email: TEST_EMAIL,
                club: 'Sporting',
                description: 'Integration test automated run'
            })
        });

        const res = await submitClub(req);
        expect(res.status).toBe(200);

        // Direct database assertion against real PostgreSQL instance
        const dbRecord = await prisma.clubRecord.findUnique({ where: { email: TEST_EMAIL } });
        expect(dbRecord).not.toBeNull();
        expect(dbRecord?.name).toBe('Sporting');
    });

    it('Should query consolidated user summary via Stored Function using /api/results', async () => {
        const req = new Request('http://localhost:3000/api/results', {
            method: 'POST',
            body: JSON.stringify({
                email: TEST_EMAIL
            })
        });

        const res = await fetchResults(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.found).toBe(true);
        expect(json.data.email).toBe(TEST_EMAIL);
        expect(json.data.club_name).toBe('Sporting');
    });
});