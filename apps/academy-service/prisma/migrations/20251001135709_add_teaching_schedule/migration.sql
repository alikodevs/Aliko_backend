-- CreateEnum
CREATE TYPE "public"."ScheduleType" AS ENUM ('LIVE', 'RECORDING', 'Q_AND_A', 'OFFICE_HOURS', 'WORKSHOP');

-- CreateTable
CREATE TABLE "public"."TeachingSchedule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" "public"."ScheduleType" NOT NULL,
    "courseId" INTEGER NOT NULL,
    "instructorId" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TeachingSchedule" ADD CONSTRAINT "TeachingSchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeachingSchedule" ADD CONSTRAINT "TeachingSchedule_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "public"."AcademyProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
