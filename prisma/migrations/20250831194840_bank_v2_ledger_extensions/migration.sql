/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Ledger` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Ledger" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "fee" INTEGER,
ADD COLUMN     "fromTarget" "public"."BalanceTarget",
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "peerUserId" TEXT,
ADD COLUMN     "toTarget" "public"."BalanceTarget",
ADD COLUMN     "transferGroupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_idempotencyKey_key" ON "public"."Ledger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Ledger_transferGroupId_idx" ON "public"."Ledger"("transferGroupId");

-- CreateIndex
CREATE INDEX "Ledger_peerUserId_createdAt_idx" ON "public"."Ledger"("peerUserId", "createdAt");
