-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('ADMIN_ADJUST', 'TRANSFER_IN', 'TRANSFER_OUT', 'BET_PLACED', 'BET_PAYOUT');

-- CreateEnum
CREATE TYPE "public"."BalanceTarget" AS ENUM ('WALLET', 'BANK');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "type" "public"."LedgerType" NOT NULL,
    "target" "public"."BalanceTarget" NOT NULL,
    "delta" INTEGER NOT NULL,
    "memo" TEXT,
    "balanceAfter" INTEGER,
    "bankAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "public"."Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_adminId_idx" ON "public"."Ledger"("adminId");

-- CreateIndex
CREATE INDEX "Ledger_type_target_idx" ON "public"."Ledger"("type", "target");

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "public"."User"("isAdmin");

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
