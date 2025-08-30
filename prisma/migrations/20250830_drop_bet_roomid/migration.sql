-- 先把可能存在的 FK / 索引拆掉
DO $$
BEGIN
  -- 刪除可能存在的外鍵
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Bet_roomId_fkey'
  ) THEN
    ALTER TABLE "Bet" DROP CONSTRAINT "Bet_roomId_fkey";
  END IF;

  -- 刪除可能存在的索引
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Bet_roomId_idx') THEN
    DROP INDEX "Bet_roomId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bet_round_side') THEN
    DROP INDEX "idx_bet_round_side";
  END IF;

  -- 最後刪欄位（若存在）
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Bet' AND column_name = 'roomId'
  ) THEN
    ALTER TABLE "Bet" DROP COLUMN "roomId";
  END IF;
END $$;
