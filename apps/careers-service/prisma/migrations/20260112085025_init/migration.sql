-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "salaryRange" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Remote',
    "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "postedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "resumeUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,
    "isPrimaryRecruiter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_userId_jobId_key" ON "JobApplication"("userId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
