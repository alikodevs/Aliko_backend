import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany();
  console.log('Total courses:', courses.length);
  console.log('Statuses:', courses.map(c => c.status));
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
