/**
 * Create Con-Tech test users for every role:
 * ADMIN, CONTRACTOR, CLIENT, PROJECT_MANAGER, USER
 *
 * This script creates:
 *   1. Firebase Auth users
 *   2. Auth-service DB records (User + domain user records)
 *   3. Con-Tech DB records (ContechProfile)
 *
 * Usage:
 *   node scripts/create-contech-users.js
 *
 * Requires:
 *   - PostgreSQL running on localhost:5432
 *   - Firebase service account at ./firebase-service-account.json
 */

const path = require('path');
const fs = require('fs');
const { PrismaClient: AuthPrismaClient } = require(path.join(__dirname, '..', 'domains', 'core-platform-services', 'auth-service', 'src', 'generated', 'client'));
const admin = require('firebase-admin');
const argon2 = require('argon2');

// ─── Config ────────────────────────────────────────────────────────
const AUTH_DB_URL = 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db?schema=auth';
const CONTECH_DB_URL = 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db?schema=contech';
const FIREBASE_SA_PATH = path.resolve(__dirname, '../firebase-service-account.json');

const SHARED_PASSWORD = 'ConTech@2026!';

const CONTECH_USERS = [
  {
    email: 'contech.admin@alikohub.com',
    firstname: 'ConTech',
    lastname: 'Admin',
    contechRole: 'ADMIN',
    globalRole: 'ADMIN',
  },
  {
    email: 'contech.contractor@alikohub.com',
    firstname: 'ConTech',
    lastname: 'Contractor',
    contechRole: 'CONTRACTOR',
    globalRole: 'USER',
  },
  {
    email: 'contech.client@alikohub.com',
    firstname: 'ConTech',
    lastname: 'Client',
    contechRole: 'CLIENT',
    globalRole: 'USER',
  },
  {
    email: 'contech.pm@alikohub.com',
    firstname: 'ConTech',
    lastname: 'ProjectManager',
    contechRole: 'PROJECT_MANAGER',
    globalRole: 'USER',
  },
  {
    email: 'contech.user@alikohub.com',
    firstname: 'ConTech',
    lastname: 'User',
    contechRole: 'USER',
    globalRole: 'USER',
  },
];

// ─── Prisma clients ───────────────────────────────────────────────
const authPrisma = new AuthPrismaClient({
  datasources: { db: { url: AUTH_DB_URL } },
});

// For the contech schema we use a raw PG client since the generated
// Prisma client lives in a different package. We'll use auth prisma $executeRawUnsafe
// Actually let's just use a second plain PrismaClient pointing to contech.

// We'll use raw SQL via the pg module for contech since the prisma client
// is generated for the auth schema only.
const { Client: PgClient } = require('pg');

// ─── Firebase init ────────────────────────────────────────────────
function initFirebase() {
  if (!fs.existsSync(FIREBASE_SA_PATH)) {
    console.error(`Firebase service account not found at: ${FIREBASE_SA_PATH}`);
    process.exit(1);
  }

  if (!admin.apps.length) {
    const sa = JSON.parse(fs.readFileSync(FIREBASE_SA_PATH, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  return admin.auth();
}

// ─── Helpers ──────────────────────────────────────────────────────
async function getOrCreateFirebaseUser(auth, email, password, displayName) {
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`  Firebase: already exists → ${existing.uid}`);
    return existing;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await auth.createUser({ email, password, displayName });
      console.log(`  Firebase: created → ${created.uid}`);
      return created;
    }
    throw e;
  }
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Creating Con-Tech Users for Every Role        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const auth = initFirebase();
  const hashedPassword = await argon2.hash(SHARED_PASSWORD);

  // Raw PG for contech schema
  const pg = new PgClient({
    connectionString: 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db',
  });
  await pg.connect();
  await pg.query(`SET search_path TO contech`);

  const results = [];

  for (const u of CONTECH_USERS) {
    console.log(`\n─── ${u.contechRole} ───────────────────────────────`);
    console.log(`  Email: ${u.email}`);

    // 1. Firebase
    const fbUser = await getOrCreateFirebaseUser(
      auth,
      u.email,
      SHARED_PASSWORD,
      `${u.firstname} ${u.lastname}`,
    );
    const firebaseId = fbUser.uid;

    // 2. Auth DB – User (upsert)
    const existingUser = await authPrisma.user.findUnique({ where: { email: u.email } });
    let dbUser;
    if (existingUser) {
      dbUser = await authPrisma.user.update({
        where: { email: u.email },
        data: {
          firebaseId,
          password: hashedPassword,
          globalRole: u.globalRole,
          status: 'ACTIVE',
        },
      });
      console.log(`  Auth DB User: updated (id=${dbUser.id})`);
    } else {
      dbUser = await authPrisma.user.create({
        data: {
          firebaseId,
          email: u.email,
          firstname: u.firstname,
          lastname: u.lastname,
          password: hashedPassword,
          globalRole: u.globalRole,
          status: 'ACTIVE',
        },
      });
      console.log(`  Auth DB User: created (id=${dbUser.id})`);
    }

    // 3. ContechUser record in auth schema (upsert)
    const existingContechUser = await authPrisma.contechUser.findUnique({
      where: { userId: firebaseId },
    });
    if (existingContechUser) {
      await authPrisma.contechUser.update({
        where: { userId: firebaseId },
        data: { role: u.contechRole, status: 'ACTIVE' },
      });
      console.log(`  Auth ContechUser: updated → ${u.contechRole}`);
    } else {
      await authPrisma.contechUser.create({
        data: { userId: firebaseId, role: u.contechRole, status: 'ACTIVE' },
      });
      console.log(`  Auth ContechUser: created → ${u.contechRole}`);
    }

    // 4. Other domain user records (create if missing)
    for (const [model, role] of [
      ['academyUser', 'USER'],
      ['eventsUser', 'USER'],
      ['consultancyUser', 'USER'],
      ['careersUser', 'USER'],
    ]) {
      const existing = await authPrisma[model].findUnique({ where: { userId: firebaseId } });
      if (!existing) {
        await authPrisma[model].create({
          data: { userId: firebaseId, role, status: 'ACTIVE' },
        });
        console.log(`  Auth ${model}: created → ${role}`);
      }
    }

    // 5. ContechProfile in contech schema (upsert via raw SQL)
    const profileCheck = await pg.query(
      `SELECT id FROM "ContechProfile" WHERE "userId" = $1`,
      [firebaseId],
    );
    if (profileCheck.rows.length > 0) {
      await pg.query(
        `UPDATE "ContechProfile"
         SET role = $1::"ContechRole", "hasSelectedRole" = true, "updatedAt" = NOW()
         WHERE "userId" = $2`,
        [u.contechRole, firebaseId],
      );
      console.log(`  Contech Profile: updated → ${u.contechRole}`);
    } else {
      await pg.query(
        `INSERT INTO "ContechProfile" ("userId", "role", "hasSelectedRole", "bio", "companyName", "createdAt", "updatedAt")
         VALUES ($1, $2::"ContechRole", true, $3, $4, NOW(), NOW())`,
        [
          firebaseId,
          u.contechRole,
          `${u.firstname} ${u.lastname} – ${u.contechRole} test account`,
          u.contechRole === 'CONTRACTOR' ? 'BuildIt Construction Ltd' :
          u.contechRole === 'CLIENT' ? 'Addis Properties PLC' :
          u.contechRole === 'PROJECT_MANAGER' ? 'PM Solutions' :
          'AlikoHub',
        ],
      );
      console.log(`  Contech Profile: created → ${u.contechRole}`);
    }

    results.push({
      role: u.contechRole,
      email: u.email,
      password: SHARED_PASSWORD,
      firebaseId,
      dbUserId: dbUser.id,
    });
  }

  await pg.end();
  await authPrisma.$disconnect();

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     CREDENTIALS SUMMARY                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Shared Password: ${SHARED_PASSWORD.padEnd(43)} ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    console.log(`║  ${r.role.padEnd(17)} │ ${r.email.padEnd(40)} ║`);
  }
  console.log('╚══════════════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
