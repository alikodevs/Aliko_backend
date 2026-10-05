import { PrismaClient } from '@prisma/client/user';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedTestUsers() {
  console.log('\n========================================================================');
  console.log('   🌱 SEEDING TEST USERS & ADMIN ACCOUNTS (ALIKOHUB USER SERVICE)      ');
  console.log('========================================================================\n');

  const rawPassword = 'Password@123';
  const hashedPassword = await argon2.hash(rawPassword);

  const testUsers = [
    {
      email: 'admin@alikohub.com',
      firebaseId: 'seed-admin-001',
      firstname: 'System',
      lastname: 'Admin',
      globalRole: 'ADMIN' as const,
      phone: '+251911000001',
    },
    {
      email: 'instructor@alikohub.com',
      firebaseId: 'seed-instructor-001',
      firstname: 'Abebe',
      lastname: 'Bekele',
      globalRole: 'USER' as const,
      phone: '+251911000002',
    },
    {
      email: 'student@alikohub.com',
      firebaseId: 'seed-student-001',
      firstname: 'Almaz',
      lastname: 'Haile',
      globalRole: 'USER' as const,
      phone: '+251911000003',
    },
  ];

  for (const u of testUsers) {
    console.log(`Checking existing user: ${u.email}...`);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: u.email }, { firebaseId: u.firebaseId }] },
    });

    if (existing) {
      console.log(`Updating user [${u.email}]...`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstname: u.firstname,
          lastname: u.lastname,
          password: hashedPassword,
          globalRole: u.globalRole,
          phone: u.phone,
          status: 'ACTIVE',
        },
      });
    } else {
      console.log(`Creating user [${u.email}] with role [${u.globalRole}]...`);
      await prisma.user.create({
        data: {
          email: u.email,
          firebaseId: u.firebaseId,
          firstname: u.firstname,
          lastname: u.lastname,
          password: hashedPassword,
          globalRole: u.globalRole,
          phone: u.phone,
          status: 'ACTIVE',
          authProvider: 'EMAIL',
        },
      });
    }
  }

  console.log('\n✔ All test users seeded successfully!');
  console.log('Credentials: Password@123 for all seeded accounts.');
  console.log('========================================================================\n');
}

seedTestUsers()
  .catch((err) => {
    console.error('Error seeding test users:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
