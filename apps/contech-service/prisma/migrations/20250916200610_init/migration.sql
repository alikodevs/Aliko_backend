-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'DELAYED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'AMENDED');

-- CreateEnum
CREATE TYPE "public"."InspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ChecklistItemStatus" AS ENUM ('PASS', 'FAIL', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "public"."ContechRole" AS ENUM ('CLIENT', 'CONTRACTOR', 'PROJECT_MANAGER', 'ADMIN', 'USER');

-- CreateTable
CREATE TABLE "public"."ContechProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ContechRole" NOT NULL DEFAULT 'USER',
    "hasSelectedRole" BOOLEAN NOT NULL DEFAULT false,
    "Bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContechProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "budget_cents" DOUBLE PRECISION,
    "progress" DOUBLE PRECISION DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "progress" INTEGER,
    "deadline" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "changeOrders" JSONB,
    "rfis" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Inspection" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "photos" TEXT[],
    "status" "public"."InspectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistItem" (
    "id" SERIAL NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "status" "public"."ChecklistItemStatus" NOT NULL,
    "comment" TEXT,
    "inspectionId" INTEGER NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClientReport" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "kpis" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ClientReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContechProfile_userId_key" ON "public"."ContechProfile"("userId");

-- CreateIndex
CREATE INDEX "Project_managerId_idx" ON "public"."Project"("managerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "public"."Project"("status");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "public"."Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status");

-- CreateIndex
CREATE INDEX "Task_assignedTo_idx" ON "public"."Task"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_publicId_key" ON "public"."Contract"("publicId");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "public"."Contract"("projectId");

-- CreateIndex
CREATE INDEX "Inspection_projectId_idx" ON "public"."Inspection"("projectId");

-- CreateIndex
CREATE INDEX "Inspection_inspectorId_idx" ON "public"."Inspection"("inspectorId");

-- CreateIndex
CREATE INDEX "Inspection_status_idx" ON "public"."Inspection"("status");

-- CreateIndex
CREATE INDEX "ChecklistItem_inspectionId_idx" ON "public"."ChecklistItem"("inspectionId");

-- CreateIndex
CREATE INDEX "ClientReport_projectId_idx" ON "public"."ClientReport"("projectId");

-- CreateIndex
CREATE INDEX "ClientReport_generatedAt_idx" ON "public"."ClientReport"("generatedAt");

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inspection" ADD CONSTRAINT "Inspection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistItem" ADD CONSTRAINT "ChecklistItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "public"."Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientReport" ADD CONSTRAINT "ClientReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
