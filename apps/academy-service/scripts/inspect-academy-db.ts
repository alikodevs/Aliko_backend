import { PrismaClient } from '../src/generated/client';

async function main() {
  const prisma = new PrismaClient();
  
  console.log("=== COURSE ===");
  const course = await prisma.course.findUnique({
    where: { id: 3 },
  });
  console.log(course);

  console.log("\n=== LESSON ===");
  const lesson = await prisma.lesson.findUnique({
    where: { id: 5 },
    include: { module: true },
  });
  console.log(lesson);

  console.log("\n=== ENROLLMENTS ===");
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 3 },
  });
  console.log(enrollments);

  console.log("\n=== PROGRESS FOR COURSE 3 ===");
  const progress = await prisma.progress.findMany({
    where: { courseId: 3 },
  });
  console.log(progress);

  await prisma.$disconnect();
}

main().catch(console.error);
