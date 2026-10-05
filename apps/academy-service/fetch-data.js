const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst();
  const module = await prisma.module.findFirst();
  const lesson = await prisma.lesson.findFirst();
  
  console.log(JSON.stringify({ course, module, lesson }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
