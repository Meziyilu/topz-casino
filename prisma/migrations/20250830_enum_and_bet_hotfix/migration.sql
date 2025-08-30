-- 1) 先補 enum，避免「新增後未 commit 就使用」的情況
DO $$
BEGIN
  -- 補 LedgerType::TRANSFER（若不存在）
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LedgerType' AND e.enumlabel = 'TRANSFER'
  ) THEN
    ALTER TYPE "LedgerType" ADD VALUE 'TRANSFER';
  END IF;

  -- 補 RoundPhase::REVEALING（若歷史曾是 REVEAL）
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'RoundPhase' AND e.enumlabel = 'REVEALING'
  ) THEN
    ALTER TYPE "RoundPhase" ADD VALUE 'REVEALING';
  END IF;
END $$;

-- 2) 清理可能殘留的 Bet.roomId（下注基於 roundId，不需要 roomId）
DO $$
BEGIN
  -- 拆掉 FK（若有）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND constraint_name = 'Bet_roomId_fkey'
  ) THEN
    ALTER TABLE "Bet" DROP CONSTRAINT "Bet_roomId_fkey";
  END IF;

  -- 拆掉 index（若有）
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Bet_roomId_idx') THEN
    DROP INDEX "Bet_roomId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bet_round_side') THEN
    DROP INDEX "idx_bet_round_side";
  END IF;

  -- 刪欄位（若存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Bet' AND column_name = 'roomId'
  ) THEN
    ALTER TABLE "Bet" DROP COLUMN "roomId";
  END IF;
END $$;
