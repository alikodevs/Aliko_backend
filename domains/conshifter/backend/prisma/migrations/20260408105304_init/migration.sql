-- CreateEnum
CREATE TYPE "conshifter"."ConshifterRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "conshifter"."ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "conshifter"."EventType" AS ENUM ('CONFERENCE', 'WORKSHOP', 'WEBINAR', 'SUMMIT', 'DEMO_DAY', 'MEETUP');

-- CreateEnum
CREATE TYPE "conshifter"."MembershipTier" AS ENUM ('OBSERVER', 'MEMBER', 'PREMIUM', 'FOUNDING');

-- CreateEnum
CREATE TYPE "conshifter"."OrganizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "conshifter"."OrganizationType" AS ENUM ('STARTUP', 'CONTRACTOR', 'UNIVERSITY', 'INVESTOR', 'GOVERNMENT', 'NGO', 'ASSOCIATION', 'CONSULTANT');

-- CreateTable
CREATE TABLE "conshifter"."conshifter_profiles" (
    "id" TEXT NOT NULL,
    "role" "conshifter"."ConshifterRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conshifter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "event_type" "conshifter"."EventType" NOT NULL,
    "location" TEXT,
    "is_virtual" BOOLEAN NOT NULL DEFAULT false,
    "virtual_link" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "registration_link" TEXT,
    "image_url" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "conshifter"."OrganizationType" NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "focus_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" TEXT,
    "status" "conshifter"."OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_by_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "long_description" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "partner_type" TEXT NOT NULL DEFAULT 'partner',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."testimonials" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_title" TEXT,
    "author_organization" TEXT,
    "author_image_url" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."membership_applications" (
    "id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "organization_type" "conshifter"."OrganizationType" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "website" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tier" "conshifter"."MembershipTier" NOT NULL,
    "motivation" TEXT,
    "how_heard" TEXT,
    "status" "conshifter"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conshifter"."stats" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "conshifter"."events"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "conshifter"."organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "programs_slug_key" ON "conshifter"."programs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "conshifter"."newsletter_subscribers"("email");
