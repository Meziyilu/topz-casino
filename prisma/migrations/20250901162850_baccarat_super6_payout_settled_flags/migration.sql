-- AlterTable
ALTER TABLE "public"."Round" ADD COLUMN     "payoutSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedNoCommission" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Round_payoutSettled_phase_idx" ON "public"."Round"("payoutSettled", "phase");
