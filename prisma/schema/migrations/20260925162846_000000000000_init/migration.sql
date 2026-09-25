-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PENDING', 'PERSONAL', 'ORGANIZATION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;
