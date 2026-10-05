-- CreateEnum
CREATE TYPE "public"."GlobalRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AcademyRole" AS ENUM ('USER', 'STUDENT', 'INSTRUCTOR', 'COURSE_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ConsultancyRole" AS ENUM ('USER', 'STUDENT', 'ADVISOR', 'PARTNER_INSTITUTION', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ContechRole" AS ENUM ('USER', 'CLIENT', 'CONTRACTOR', 'PROJECT_MANAGER', 'STAKEHOLDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."EventsRole" AS ENUM ('USER', 'ATTENDEE', 'ORGANIZER', 'SPONSOR', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "firebaseId" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "globalRole" "public"."GlobalRole" NOT NULL DEFAULT 'USER',
    "profilePicture" TEXT,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsultancyUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ConsultancyRole" NOT NULL,
    "university" TEXT,
    "country" TEXT,
    "educationLevel" TEXT,
    "specialization" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultancyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcademyUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."AcademyRole" NOT NULL,
    "activeRole" "public"."AcademyRole" NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContechUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ContechRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContechUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventsUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."EventsRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventsUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseId_key" ON "public"."User"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_domain_key" ON "public"."Application"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultancyUser_userId_key" ON "public"."ConsultancyUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyUser_userId_key" ON "public"."AcademyUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContechUser_userId_key" ON "public"."ContechUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventsUser_userId_key" ON "public"."EventsUser"("userId");

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("firebaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultancyUser" ADD CONSTRAINT "ConsultancyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("firebaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AcademyUser" ADD CONSTRAINT "AcademyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("firebaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContechUser" ADD CONSTRAINT "ContechUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("firebaseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventsUser" ADD CONSTRAINT "EventsUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("firebaseId") ON DELETE RESTRICT ON UPDATE CASCADE;
