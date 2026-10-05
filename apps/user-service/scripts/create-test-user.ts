import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const id = `test-user-${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      firebaseId: id,
      email: `${id}@example.com`,
      firstname: 'Test',
      lastname: 'User',
      globalRole: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('Created Test User:', user.firebaseId);
  await prisma.$disconnect();
}

main().catch(console.error);
