/*
  Warnings:

  - You are about to drop the column `Bio` on the `ContechProfile` table. All the data in the column will be lost.
  - Added the required column `contractorId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspectorId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."ChecklistItemStatus" ADD VALUE 'PENDING';

-- AlterEnum
ALTER TYPE "public"."ContractStatus" ADD VALUE 'TERMINATED';

-- AlterEnum
ALTER TYPE "public"."InspectionStatus" ADD VALUE 'SCHEDULED';

-- AlterEnum
ALTER TYPE "public"."TaskStatus" ADD VALUE 'TODO';

-- AlterTable
ALTER TABLE "public"."ClientReport" ALTER COLUMN "kpis" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ContechProfile" DROP COLUMN "Bio",
ADD COLUMN     "bio" TEXT;

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "contractorId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "inspectorId" TEXT NOT NULL,
ADD COLUMN     "site" TEXT,
ADD COLUMN     "subtitle" TEXT,
ALTER COLUMN "managerId" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "title" TEXT,
ALTER COLUMN "progress" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_projectId_idx" ON "public"."Comment"("projectId");

-- CreateIndex
CREATE INDEX "Project_inspectorId_idx" ON "public"."Project"("inspectorId");

-- CreateIndex
CREATE INDEX "Project_contractorId_idx" ON "public"."Project"("contractorId");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
