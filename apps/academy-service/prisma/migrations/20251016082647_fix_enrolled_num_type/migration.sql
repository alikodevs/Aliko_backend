/*
  Warnings:

  - The `enrolledNum` column on the `Course` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Course" DROP COLUMN "enrolledNum",
ADD COLUMN     "enrolledNum" INTEGER;
