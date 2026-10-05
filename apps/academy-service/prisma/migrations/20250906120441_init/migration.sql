-- CreateEnum
CREATE TYPE "public"."LessonType" AS ENUM ('VIDEO', 'WEBINAR', 'ASSIGNMENT', 'QUIZ');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('VIDEO', 'PDF', 'QUIZ', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "public"."CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."AcademyRole" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."AcademyProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."AcademyRole" NOT NULL DEFAULT 'STUDENT',
    "bio" TEXT,
    "expertise" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "instructorId" TEXT NOT NULL,
    "status" "public"."CourseStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cohort" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Enrollment" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" INTEGER,
    "courseId" INTEGER,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Module" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lesson" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."LessonType" NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "maxScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."ContentType" NOT NULL,
    "url" TEXT NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Progress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "moduleId" INTEGER,
    "lessonId" INTEGER,
    "contentId" INTEGER,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyProfile_userId_key" ON "public"."AcademyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_cohortId_courseId_key" ON "public"."Enrollment"("userId", "cohortId", "courseId");

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."AcademyProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cohort" ADD CONSTRAINT "Cohort_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "public"."Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AcademyProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Content" ADD CONSTRAINT "Content_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AcademyProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AcademyProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
