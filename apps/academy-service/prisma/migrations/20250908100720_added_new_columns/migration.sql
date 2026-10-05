/*
  Warnings:

  - You are about to drop the column `description` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Course" DROP COLUMN "description",
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "thumbnail" TEXT;
