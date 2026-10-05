-- AlterTable
ALTER TABLE "public"."Course" ADD COLUMN     "conceptsLearned" TEXT[],
ADD COLUMN     "enrolledNum" TEXT,
ADD COLUMN     "estimatedTime" INTEGER,
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "prerequisites" TEXT[],
ADD COLUMN     "price" INTEGER,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "skills" TEXT[],
ADD COLUMN     "targetLevel" TEXT;
