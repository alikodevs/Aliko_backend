/**
 * Create Events test users for every role:
 * ADMIN, CONTENT_MANAGER, USER
 *
 * This script creates:
 *   1. Firebase Auth users
 *   2. Auth-service DB records (User + EventsUser)
 *   3. Events DB records (EventsProfile)
 *
 * Usage:
 *   node scripts/create-events-users.cjs
 *
 * Requires:
 *   - PostgreSQL running on localhost:5432
 *   - Firebase service account at ./firebase-service-account.json
 */

const path = require('path');
const fs = require('fs');
const { PrismaClient: AuthPrismaClient } = require(
  path.join(__dirname, '..', 'domains', 'core-platform-services', 'auth-service', 'src', 'generated', 'client')
);
const admin = require('firebase-admin');
const argon2 = require('argon2');
const { Client: PgClient } = require('pg');

// ─── Config ────────────────────────────────────────────────────────
const AUTH_DB_URL = 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db?schema=auth';
const FIREBASE_SA_PATH = path.resolve(__dirname, '../firebase-service-account.json');

const SHARED_PASSWORD = 'Events@2026!';

const EVENTS_USERS = [
  {
    email: 'events.admin@alikohub.com',
    firstname: 'Events',
    lastname: 'Admin',
    eventsRole: 'ADMIN',
    globalRole: 'ADMIN',
  },
  {
    email: 'events.cm@alikohub.com',
    firstname: 'Events',
    lastname: 'ContentManager',
    eventsRole: 'CONTENT_MANAGER',
    globalRole: 'USER',
  },
  {
    email: 'events.user@alikohub.com',
    firstname: 'Events',
    lastname: 'User',
    eventsRole: 'USER',
    globalRole: 'USER',
  },
];

// ─── Prisma clients ───────────────────────────────────────────────
const authPrisma = new AuthPrismaClient({
  datasources: { db: { url: AUTH_DB_URL } },
});

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
  console.log('║   Creating Events Users for Every Role          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const auth = initFirebase();
  const hashedPassword = await argon2.hash(SHARED_PASSWORD);

  // Raw PG for events schema
  const pg = new PgClient({
    connectionString: 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db',
  });
  await pg.connect();
  await pg.query(`SET search_path TO events`);

  const results = [];

  for (const u of EVENTS_USERS) {
    console.log(`\n─── ${u.eventsRole} ───────────────────────────────`);
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

    // 3. EventsUser record in auth schema (upsert)
    const existingEventsUser = await authPrisma.eventsUser.findUnique({
      where: { userId: firebaseId },
    });
    if (existingEventsUser) {
      await authPrisma.eventsUser.update({
        where: { userId: firebaseId },
        data: { role: u.eventsRole, status: 'ACTIVE' },
      });
      console.log(`  Auth EventsUser: updated → ${u.eventsRole}`);
    } else {
      await authPrisma.eventsUser.create({
        data: { userId: firebaseId, role: u.eventsRole, status: 'ACTIVE' },
      });
      console.log(`  Auth EventsUser: created → ${u.eventsRole}`);
    }

    // 4. Other domain user records (create if missing)
    for (const [model, role] of [
      ['academyUser', 'USER'],
      ['contechUser', 'USER'],
      ['consultancyUser', 'USER'],
      ['careersUser', 'USER'],
    ]) {
      try {
        const existing = await authPrisma[model].findUnique({ where: { userId: firebaseId } });
        if (!existing) {
          await authPrisma[model].create({
            data: { userId: firebaseId, role, status: 'ACTIVE' },
          });
          console.log(`  Auth ${model}: created → ${role}`);
        }
      } catch (e) {
        // Some models may not have 'role', skip gracefully
        console.log(`  Auth ${model}: skipped (${e.message.substring(0, 50)}...)`);
      }
    }

    // 5. EventsProfile in events schema (upsert via raw SQL)
    const profileCheck = await pg.query(
      `SELECT id FROM "EventsProfile" WHERE id = $1`,
      [firebaseId],
    );
    if (profileCheck.rows.length > 0) {
      await pg.query(
        `UPDATE "EventsProfile"
         SET role = $1::"EventsRole", "updatedAt" = NOW()
         WHERE id = $2`,
        [u.eventsRole, firebaseId],
      );
      console.log(`  Events Profile: updated → ${u.eventsRole}`);
    } else {
      await pg.query(
        `INSERT INTO "EventsProfile" (id, role, "createdAt", "updatedAt")
         VALUES ($1, $2::"EventsRole", NOW(), NOW())`,
        [firebaseId, u.eventsRole],
      );
      console.log(`  Events Profile: created → ${u.eventsRole}`);
    }

    results.push({
      role: u.eventsRole,
      email: u.email,
      password: SHARED_PASSWORD,
      firebaseId,
      dbUserId: dbUser.id,
    });
  }

  // Also ensure the existing admin@alikohub.com has an EventsProfile
  const globalAdmin = await authPrisma.user.findUnique({ where: { email: 'admin@alikohub.com' } });
  if (globalAdmin) {
    const adminProfileCheck = await pg.query(
      `SELECT id FROM "EventsProfile" WHERE id = $1`,
      [globalAdmin.firebaseId],
    );
    if (adminProfileCheck.rows.length === 0) {
      await pg.query(
        `INSERT INTO "EventsProfile" (id, role, "createdAt", "updatedAt")
         VALUES ($1, 'ADMIN'::"EventsRole", NOW(), NOW())`,
        [globalAdmin.firebaseId],
      );
      console.log(`\n  Global Admin (admin@alikohub.com): EventsProfile created → ADMIN`);
    }
  }

  await pg.end();
  await authPrisma.$disconnect();

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                     EVENTS CREDENTIALS SUMMARY                      ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Shared Password: ${SHARED_PASSWORD.padEnd(49)} ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    console.log(`║  ${r.role.padEnd(17)} │ ${r.email.padEnd(46)} ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Also available: admin@alikohub.com / AdminPassword123!             ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
