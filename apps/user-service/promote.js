const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:1234@localhost:5433/postgres"
    }
  }
});

async function promote(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User ${email} not found`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { globalRole: 'ADMIN' }
  });

  await prisma.academyUser.upsert({
    where: { userId: user.firebaseId },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: { userId: user.firebaseId, role: 'ADMIN', status: 'ACTIVE' }
  });

  console.log(`User ${email} promoted to ADMIN`);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node promote.js <email>');
  process.exit(1);
}

promote(email).then(() => prisma.$disconnect()).catch(console.error);
