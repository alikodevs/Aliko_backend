import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// Manual env loading/definition
const AUTH_DB_URL = 'postgres://postgres:1234@localhost:5433/postgres';
const ACADEMY_DB_URL = 'postgresql://academy_user:academy_pass@localhost:5433/academydb';

function generateCuid() {
    // Simple mock CUID generator for the script
    return 'c' + crypto.randomBytes(12).toString('hex');
}

async function backfill() {
    console.log('Starting FULL backfill process (Auth & Academy DBs)...');

    const authClient = new Client({ connectionString: AUTH_DB_URL });
    const academyClient = new Client({ connectionString: ACADEMY_DB_URL });

    try {
        await authClient.connect();
        console.log('Connected to Auth DB');
        await academyClient.connect();
        console.log('Connected to Academy DB');

        // 1. Fetch users from Auth DB
        const res = await authClient.query('SELECT "firebaseId" FROM "User"');
        const users = res.rows;
        console.log(`Found ${users.length} users in Auth DB`);

        let createdAcademyProfiles = 0;
        let createdAuthAcademyUsers = 0;

        for (const user of users) {
             // 2. Upsert into Academy Service DB ("AcademyProfile")
             const academyUpsertQuery = `
                INSERT INTO "AcademyProfile" ("userId", "role", "hasSelectedRole", "updatedAt", "expertise")
                VALUES ($1, 'student', false, NOW(), ARRAY[]::text[])
                ON CONFLICT ("userId") DO NOTHING;
             `;
             // Note: using 'student' (lowercase) or 'STUDENT' depending on enum in Academy DB? 
             // Academy DB Enum: USER, ADMIN, STUDENT, INSTRUCTOR.
             // Wait, previous script used 'USER'. Academy DB default is USER. 
             // Let's stick to 'USER' for Academy DB to be safe/consistent with schema default, 
             // but user requested STUDENT/USER consistency. 
             // Actually Academy DB defaults to USER. Let's use 'USER' there.
             
             const resultAcademy = await academyClient.query(academyUpsertQuery.replace("'student'", "'USER'"), [user.firebaseId]);
             if (resultAcademy.rowCount && resultAcademy.rowCount > 0) {
                 createdAcademyProfiles++;
             }

             // 3. Upsert into Auth Service DB ("AcademyUser")
             // Auth DB Enum: STUDENT, INSTRUCTOR, ... (NO 'USER' role!)
             // So we MUST use 'STUDENT'.
             
             // Check if exists first (since we need to generate ID)
             const checkAuth = await authClient.query('SELECT 1 FROM "AcademyUser" WHERE "userId" = $1', [user.firebaseId]);
             if (checkAuth.rowCount === 0) {
                 const id = generateCuid();
                 const authInsertQuery = `
                    INSERT INTO "AcademyUser" ("id", "userId", "role", "status", "enrolledCourses", "certifications", "createdAt", "updatedAt")
                    VALUES ($1, $2, 'STUDENT', 'ACTIVE', ARRAY[]::text[], ARRAY[]::text[], NOW(), NOW());
                 `;
                 await authClient.query(authInsertQuery, [id, user.firebaseId]);
                 createdAuthAcademyUsers++;
             }
        }

        console.log(`Backfill complete.`);
        console.log(`AcademyProfiles created (Academy DB): ${createdAcademyProfiles}`);
        console.log(`AcademyUsers created (Auth DB): ${createdAuthAcademyUsers}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await authClient.end();
        await academyClient.end();
    }
}

backfill();
