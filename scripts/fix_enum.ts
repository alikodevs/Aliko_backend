import * as path from 'path';
import * as dotenv from 'dotenv';

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

const userDbUrl =
  process.env.DATABASE_URL_USER ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/user_db?schema=public';

const prisma = new UserPrismaClient({
  datasources: { db: { url: userDbUrl } },
});

async function fixEnum() {
  // 1. Diagnose: list all AcademyRole enum values across all schemas
  console.log('\n=== DIAGNOSING AcademyRole enum ===\n');
  const enumValues: any[] = await prisma.$queryRawUnsafe(`
    SELECT n.nspname as schema, e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'AcademyRole'
    ORDER BY n.nspname, e.enumsortorder;
  `);

  console.log('Current AcademyRole enum values:');
  for (const row of enumValues) {
    console.log(`  [${row.schema}] ${row.enumlabel}`);
  }

  // 2. Find which schemas have the enum but are missing COMMISSION_AUDITOR
  const schemas = [...new Set(enumValues.map((r: any) => r.schema))];
  console.log(`\nSchemas with AcademyRole: ${schemas.join(', ')}`);

  for (const schema of schemas) {
    const hasValue = enumValues.some(
      (r: any) => r.schema === schema && r.enumlabel === 'COMMISSION_AUDITOR',
    );
    if (!hasValue) {
      console.log(`\n⚠️  Schema "${schema}" is MISSING COMMISSION_AUDITOR — adding it now...`);
      try {
        await prisma.$queryRawUnsafe(
          `ALTER TYPE "${schema}"."AcademyRole" ADD VALUE IF NOT EXISTS 'COMMISSION_AUDITOR';`,
        );
        console.log(`✅ Added COMMISSION_AUDITOR to "${schema}"."AcademyRole"`);
      } catch (err: any) {
        console.error(`❌ Failed for schema "${schema}":`, err.message);
      }
    } else {
      console.log(`✅ Schema "${schema}" already has COMMISSION_AUDITOR`);
    }
  }

  console.log('\n=== DONE ===\n');
}

fixEnum()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

