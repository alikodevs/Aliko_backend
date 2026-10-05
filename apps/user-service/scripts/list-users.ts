import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      firebaseId: true,
      email: true,
      firstname: true,
      lastname: true
    }
  });
  console.log('Sample Users:');
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
