
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const profiles = await prisma.academyProfile.findMany({
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(profiles, null, 2));
  await prisma.$disconnect();
}

main();
