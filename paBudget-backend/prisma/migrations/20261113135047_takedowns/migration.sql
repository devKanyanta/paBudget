-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- DropIndex
DROP INDEX "MenuItem_name_trgm_idx";

-- DropIndex
DROP INDEX "Place_name_trgm_idx";

-- CreateTable
CREATE TABLE "Takedown" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "TakedownStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Takedown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Takedown_status_dueAt_idx" ON "Takedown"("status", "dueAt");
