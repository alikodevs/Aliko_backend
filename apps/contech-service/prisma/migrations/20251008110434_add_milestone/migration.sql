-- CreateEnum
CREATE TYPE "public"."MilestoneStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Project" ALTER COLUMN "inspectorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Milestone" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "progress" DOUBLE PRECISION DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MilestoneReview" (
    "id" SERIAL NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "status" "public"."MilestoneStatus" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "public"."Milestone"("projectId");

-- CreateIndex
CREATE INDEX "MilestoneReview_milestoneId_idx" ON "public"."MilestoneReview"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneReview_inspectorId_idx" ON "public"."MilestoneReview"("inspectorId");

-- AddForeignKey
ALTER TABLE "public"."Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MilestoneReview" ADD CONSTRAINT "MilestoneReview_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "public"."Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
