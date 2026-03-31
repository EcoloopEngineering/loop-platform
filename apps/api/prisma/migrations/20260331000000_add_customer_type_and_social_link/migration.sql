-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PROSPECT', 'LEAD');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "type" "CustomerType" NOT NULL DEFAULT 'PROSPECT';
ALTER TABLE "customers" ADD COLUMN "social_link" TEXT;
