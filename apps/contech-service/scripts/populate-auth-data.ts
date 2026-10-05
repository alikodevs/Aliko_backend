import { Client } from 'pg';
import * as crypto from 'crypto';

// Auth and ConTech DB URLs
const AUTH_DB_URL = 'postgresql://postgres:1234@localhost:5433/postgres';
const CONTECH_DB_URL =
  'postgresql://contech_user:contech_pass@localhost:5433/contechdb';

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

async function populate() {
  console.log('Starting population process (Auth -> Con-Tech)...');

  const authClient = new Client({ connectionString: AUTH_DB_URL });
  const contechClient = new Client({ connectionString: CONTECH_DB_URL });

  try {
    await authClient.connect();
    console.log('Connected to Auth DB');
    await contechClient.connect();
    console.log('Connected to Con-Tech DB');

    // 1. Fetch users from Auth DB
    const res = await authClient.query('SELECT "firebaseId" FROM "User"');
    const users = res.rows;
    console.log(`Found ${users.length} users in Auth DB`);

    let createdContechProfiles = 0;
    let createdAuthContechUsers = 0;

    for (const user of users) {
      // 2. Upsert into Con-Tech Service DB ("ContechProfile")
      const contechUpsertQuery = `
                INSERT INTO "ContechProfile" ("userId", "role", "hasSelectedRole", "updatedAt")
                VALUES ($1, 'USER', false, NOW())
                ON CONFLICT ("userId") DO NOTHING;
             `;

      const resultContech = await contechClient.query(contechUpsertQuery, [
        user.firebaseId,
      ]);
      if (resultContech.rowCount && resultContech.rowCount > 0) {
        createdContechProfiles++;
      }

      // 3. Upsert into Auth Service DB ("ContechUser")
      const checkAuth = await authClient.query(
        'SELECT 1 FROM "ContechUser" WHERE "userId" = $1',
        [user.firebaseId],
      );
      if (checkAuth.rowCount === 0) {
        const id = generateCuid();
        const authInsertQuery = `
                    INSERT INTO "ContechUser" ("id", "userId", "role", "status", "createdAt", "updatedAt")
                    VALUES ($1, $2, 'USER', 'ACTIVE', NOW(), NOW());
                 `;
        await authClient.query(authInsertQuery, [id, user.firebaseId]);
        createdAuthContechUsers++;
      }
    }

    console.log(`Population complete.`);
    console.log(
      `ContechProfiles check/create (Con-Tech DB): ${createdContechProfiles}`,
    );
    console.log(`ContechUsers created (Auth DB): ${createdAuthContechUsers}`);
  } catch (error) {
    console.error('Population failed:', error);
  } finally {
    await authClient.end();
    await contechClient.end();
  }
}

populate();
