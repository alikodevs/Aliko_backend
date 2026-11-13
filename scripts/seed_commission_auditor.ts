import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

function loadPrismaClient(clientName: string) {
  try {
    return require(`@prisma/client/${clientName}`).PrismaClient;
  } catch {
    const directPath = path.resolve(__dirname, `../node_modules/@prisma/client/${clientName}`);
    return require(directPath).PrismaClient;
  }
}

const UserPrismaClient = loadPrismaClient('user');
const AcademyPrismaClient = loadPrismaClient('academy');

// Match user-service/src/database/prisma.service.ts datasource resolution
const userDbUrl =
  process.env.DATABASE_URL_USER ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/user_db?schema=public';

const userPrisma = new UserPrismaClient({
  datasources: { db: { url: userDbUrl } },
});

// Match academy-service/src/database/prisma.service.ts datasource resolution
let academyDbUrl =
  process.env.DATABASE_URL_ACADEMY ||
  process.env.ACADEMY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://alikohub:SecurePassword123!@127.0.0.1:5432/alikohub_db?schema=academy';

if (academyDbUrl.includes('schema=')) {
  academyDbUrl = academyDbUrl.replace(/schema=[^&]+/, 'schema=academy');
} else {
  academyDbUrl += (academyDbUrl.includes('?') ? '&' : '?') + 'schema=academy';
}

const academyPrisma = new AcademyPrismaClient({
  datasources: { db: { url: academyDbUrl } },
});

const AUDITOR_DATA = {
  email: 'auditor@alikohub.com',
  firebaseId: 'seed-auditor-001',
  firstname: 'State Commission',
  lastname: 'Auditor',
  phone: '+251911000004',
  password: 'Password@123',
  role: 'COMMISSION_AUDITOR' as const,
};

async function seedCommissionAuditor() {
  console.log('\n========================================================================');
  console.log('   🏛️  SEEDING COMMISSION_AUDITOR (WAC 246-841A-440 REQ 2 COMPLIANCE)   ');
  console.log('========================================================================\n');

  const hashedPassword = await argon2.hash(AUDITOR_DATA.password);

  // 1. Seed in User Service Database
  console.log(`[1/3] Upserting User in User DB (${AUDITOR_DATA.email})...`);
  const user = await userPrisma.user.upsert({
    where: { email: AUDITOR_DATA.email },
    update: {
      firebaseId: AUDITOR_DATA.firebaseId,
      firstname: AUDITOR_DATA.firstname,
      lastname: AUDITOR_DATA.lastname,
      password: hashedPassword,
      phone: AUDITOR_DATA.phone,
      status: 'ACTIVE',
      globalRole: 'USER',
    },
    create: {
      email: AUDITOR_DATA.email,
      firebaseId: AUDITOR_DATA.firebaseId,
      firstname: AUDITOR_DATA.firstname,
      lastname: AUDITOR_DATA.lastname,
      password: hashedPassword,
      phone: AUDITOR_DATA.phone,
      status: 'ACTIVE',
      globalRole: 'USER',
      authProvider: 'EMAIL',
    },
  });

  console.log(`[2/3] Upserting AcademyUser in User DB...`);
  await userPrisma.academyUser.upsert({
    where: { userId: user.firebaseId },
    update: {
      role: AUDITOR_DATA.role,
      activeRole: AUDITOR_DATA.role,
      status: 'ACTIVE',
    },
    create: {
      userId: user.firebaseId,
      role: AUDITOR_DATA.role,
      activeRole: AUDITOR_DATA.role,
      status: 'ACTIVE',
    },
  });

  // 2. Seed in Academy Service Database
  console.log(`[3/3] Upserting AcademyProfile in Academy DB...`);
  await academyPrisma.academyProfile.upsert({
    where: { userId: user.firebaseId },
    update: {
      role: AUDITOR_DATA.role,
      hasSelectedRole: true,
      bio: 'Washington State Nursing Care Quality Assurance Commission Regulatory Auditor Account (WAC 246-841A-440 Req 2).',
      specialization: 'Regulatory Compliance & Quality Assurance',
    },
    create: {
      userId: user.firebaseId,
      role: AUDITOR_DATA.role,
      hasSelectedRole: true,
      bio: 'Washington State Nursing Care Quality Assurance Commission Regulatory Auditor Account (WAC 246-841A-440 Req 2).',
      specialization: 'Regulatory Compliance & Quality Assurance',
    },
  });

  // 3. Generate Inspection JWT Token
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
  const inspectionToken = jwt.sign(
    {
      uid: user.firebaseId,
      firebaseId: user.firebaseId,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      globalRole: 'USER',
      role: AUDITOR_DATA.role,
      academyRole: AUDITOR_DATA.role,
      academyActiveRole: AUDITOR_DATA.role,
      status: 'ACTIVE',
    },
    jwtSecret,
    { expiresIn: '30d' },
  );

  console.log('\n✔ COMMISSION_AUDITOR seeded successfully!');
  console.log('------------------------------------------------------------------------');
  console.log(`Email:        ${AUDITOR_DATA.email}`);
  console.log(`Password:     ${AUDITOR_DATA.password}`);
  console.log(`Firebase ID:  ${AUDITOR_DATA.firebaseId}`);
  console.log(`Academy Role: ${AUDITOR_DATA.role}`);
  console.log(`Permissions:  Read-only inspection across all student & instructor views`);
  console.log(`              (Gradebooks, Discussion Rubrics, Lessons, Exam Security)`);
  console.log('------------------------------------------------------------------------');
  console.log('Sample Bearer Token (30d):');
  console.log(inspectionToken);
  console.log('========================================================================\n');
}

seedCommissionAuditor()
  .catch((err) => {
    console.error('Error seeding COMMISSION_AUDITOR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await userPrisma.$disconnect();
    await academyPrisma.$disconnect();
  });

