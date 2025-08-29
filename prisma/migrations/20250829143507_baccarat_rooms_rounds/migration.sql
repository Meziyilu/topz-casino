/*
  Warnings:

  - The values [ANY_PAIR,PERFECT_PAIR] on the enum `BetSide` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRANSFER_IN,TRANSFER_OUT,BET_PAYOUT] on the enum `LedgerType` will be removed. If these variants are still used in the database, this will fail.
  - The values [REVEAL] on the enum `RoundPhase` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `day` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `roundSeq` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `Ledger` table. All the data in the column will be lost.
  - You are about to drop the column `dayLocal` on the `Round` table. All the data in the column will be lost.
  - Made the column `roundId` on table `Bet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `balanceAfter` on table `Ledger` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bankAfter` on table `Ledger` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BetSide_new" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR');
ALTER TABLE "public"."Bet" ALTER COLUMN "side" TYPE "public"."BetSide_new" USING ("side"::text::"public"."BetSide_new");
ALTER TYPE "public"."BetSide" RENAME TO "BetSide_old";
ALTER TYPE "public"."BetSide_new" RENAME TO "BetSide";
DROP TYPE "public"."BetSide_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."LedgerType_new" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BET_PLACED', 'PAYOUT', 'TRANSFER', 'ADMIN_ADJUST');
ALTER TABLE "public"."Ledger" ALTER COLUMN "type" TYPE "public"."LedgerType_new" USING ("type"::text::"public"."LedgerType_new");
ALTER TYPE "public"."LedgerType" RENAME TO "LedgerType_old";
ALTER TYPE "public"."LedgerType_new" RENAME TO "LedgerType";
DROP TYPE "public"."LedgerType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."RoundPhase_new" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');
ALTER TABLE "public"."Round" ALTER COLUMN "phase" DROP DEFAULT;
ALTER TABLE "public"."Round" ALTER COLUMN "phase" TYPE "public"."RoundPhase_new" USING ("phase"::text::"public"."RoundPhase_new");
ALTER TYPE "public"."RoundPhase" RENAME TO "RoundPhase_old";
ALTER TYPE "public"."RoundPhase_new" RENAME TO "RoundPhase";
DROP TYPE "public"."RoundPhase_old";
ALTER TABLE "public"."Round" ALTER COLUMN "phase" SET DEFAULT 'BETTING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Bet" DROP CONSTRAINT "Bet_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bet" DROP CONSTRAINT "Bet_roundId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bet" DROP CONSTRAINT "Bet_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ledger" DROP CONSTRAINT "Ledger_adminId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ledger" DROP CONSTRAINT "Ledger_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Round" DROP CONSTRAINT "Round_roomId_fkey";

-- DropIndex
DROP INDEX "public"."Bet_roomId_day_roundSeq_idx";

-- DropIndex
DROP INDEX "public"."Bet_userId_roomId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."idx_bet_round_side";

-- DropIndex
DROP INDEX "public"."Ledger_adminId_idx";

-- DropIndex
DROP INDEX "public"."Ledger_type_target_idx";

-- DropIndex
DROP INDEX "public"."Room_code_idx";

-- DropIndex
DROP INDEX "public"."Round_roomId_day_idx";

-- DropIndex
DROP INDEX "public"."idx_round_room_createdAt";

-- DropIndex
DROP INDEX "public"."idx_round_room_startedAt";

-- DropIndex
DROP INDEX "public"."uniq_round_room_day_seq";

-- DropIndex
DROP INDEX "public"."User_isAdmin_idx";

-- AlterTable
ALTER TABLE "public"."Bet" DROP COLUMN "day",
DROP COLUMN "roomId",
DROP COLUMN "roundSeq",
ALTER COLUMN "roundId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Ledger" DROP COLUMN "adminId",
ALTER COLUMN "balanceAfter" SET NOT NULL,
ALTER COLUMN "bankAfter" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Round" DROP COLUMN "dayLocal";

-- CreateIndex
CREATE INDEX "Ledger_type_createdAt_idx" ON "public"."Ledger"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Round_roomId_day_roundSeq_idx" ON "public"."Round"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Round_phase_idx" ON "public"."Round"("phase");

-- CreateIndex
CREATE INDEX "Round_createdAt_idx" ON "public"."Round"("createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."idx_bet_round_user" RENAME TO "Bet_roundId_userId_idx";

-- RenameIndex
ALTER INDEX "public"."idx_bet_user_created" RENAME TO "Bet_userId_createdAt_idx";
