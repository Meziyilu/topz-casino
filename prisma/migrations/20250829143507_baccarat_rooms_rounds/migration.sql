-- Safe migration for baccarat_rooms_rounds
-- This script is idempotent-ish: guarded with IF EXISTS / IF NOT EXISTS where possible.

BEGIN;

------------------------------------------------------------
-- 0) 防呆：先把可能會造成 enum 轉換失敗的舊值「用文字比較」轉成新值
--    注意：不能直接用 enum 字面量比較（舊值已不存在），所以用 ::text
------------------------------------------------------------

-- BetSide: 移除 ANY_PAIR / PERFECT_PAIR（若存在，先收斂到較安全的目標）
-- 這裡示範把它們都轉為 'PLAYER_PAIR'（你要改成別的映射也可）
UPDATE "Bet"
SET "side" = 'PLAYER_PAIR'::"BetSide"
WHERE "side"::text IN ('ANY_PAIR', 'PERFECT_PAIR');

-- LedgerType: 移除 TRANSFER_IN / TRANSFER_OUT / BET_PAYOUT
-- 這裡示範：
--   TRANSFER_IN / TRANSFER_OUT => 轉成 'TRANSFER'
--   BET_PAYOUT => 轉成 'PAYOUT'
UPDATE "Ledger"
SET "type" = 'TRANSFER'::"LedgerType"
WHERE "type"::text IN ('TRANSFER_IN', 'TRANSFER_OUT');

UPDATE "Ledger"
SET "type" = 'PAYOUT'::"LedgerType"
WHERE "type"::text IN ('BET_PAYOUT');

-- RoundPhase: 移除 REVEAL（若有，改成 'REVEALING'）
UPDATE "Round"
SET "phase" = 'REVEALING'::"RoundPhase"
WHERE "phase"::text IN ('REVEAL');

------------------------------------------------------------
-- 1) 先安全移除可能存在的索引/約束（避免後續調整類型卡住）
------------------------------------------------------------
DROP INDEX IF EXISTS "idx_bet_round_side";
DROP INDEX IF EXISTS "idx_bet_user_createdAt";
DROP INDEX IF EXISTS "Round_room_day_seq_idx";
DROP INDEX IF EXISTS "Round_phase_idx";
DROP INDEX IF EXISTS "Round_createdAt_idx";
DROP INDEX IF EXISTS "Bet_round_user_idx";
DROP INDEX IF EXISTS "Bet_user_createdAt_idx";
-- 若你過去 migration 建過其他索引名稱，也可在此補上 IF EXISTS 版本

------------------------------------------------------------
-- 2) 以 rename+recreate 的方式重建 ENUM 型別（刪除舊值）
--    2.1 BetSide
------------------------------------------------------------
DO $$
BEGIN
  -- 如果舊型別存在才進行 rename，否則忽略
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BetSide') THEN
    EXECUTE 'ALTER TYPE "BetSide" RENAME TO "BetSide_old"';
  END IF;
END$$;

-- 建立新 BetSide（不含 ANY_PAIR / PERFECT_PAIR）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BetSide') THEN
    EXECUTE 'CREATE TYPE "BetSide" AS ENUM (''PLAYER'',''BANKER'',''TIE'',''PLAYER_PAIR'',''BANKER_PAIR'')';
  END IF;
END$$;

-- 調整欄位型別指向新 BetSide
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='Bet' AND column_name='side') THEN
    EXECUTE 'ALTER TABLE "Bet" ALTER COLUMN "side" TYPE "BetSide" USING "side"::text::"BetSide"';
  END IF;
END$$;

-- 刪掉舊 BetSide 型別
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BetSide_old') THEN
    EXECUTE 'DROP TYPE "BetSide_old"';
  END IF;
END$$;

------------------------------------------------------------
--    2.2 LedgerType
------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerType') THEN
    EXECUTE 'ALTER TYPE "LedgerType" RENAME TO "LedgerType_old"';
  END IF;
END$$;

-- 新 LedgerType（不含 TRANSFER_IN/TRANSFER_OUT/BET_PAYOUT）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerType') THEN
    EXECUTE 'CREATE TYPE "LedgerType" AS ENUM (''DEPOSIT'',''WITHDRAW'',''BET_PLACED'',''PAYOUT'',''TRANSFER'',''ADMIN_ADJUST'')';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='Ledger' AND column_name='type') THEN
    EXECUTE 'ALTER TABLE "Ledger" ALTER COLUMN "type" TYPE "LedgerType" USING "type"::text::"LedgerType"';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerType_old') THEN
    EXECUTE 'DROP TYPE "LedgerType_old"';
  END IF;
END$$;

------------------------------------------------------------
--    2.3 RoundPhase
------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundPhase') THEN
    EXECUTE 'ALTER TYPE "RoundPhase" RENAME TO "RoundPhase_old"';
  END IF;
END$$;

-- 新 RoundPhase（不含 REVEAL）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundPhase') THEN
    EXECUTE 'CREATE TYPE "RoundPhase" AS ENUM (''BETTING'',''REVEALING'',''SETTLED'')';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='Round' AND column_name='phase') THEN
    EXECUTE 'ALTER TABLE "Round" ALTER COLUMN "phase" TYPE "RoundPhase" USING "phase"::text::"RoundPhase"';
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundPhase_old') THEN
    EXECUTE 'DROP TYPE "RoundPhase_old"';
  END IF;
END$$;

------------------------------------------------------------
-- 3) 重新建立索引（用 IF NOT EXISTS 防止重複）
------------------------------------------------------------

-- 你 schema 中提到的索引們：
CREATE INDEX IF NOT EXISTS "Round_room_day_seq_idx" ON "Round"("roomId","day","roundSeq");
CREATE INDEX IF NOT EXISTS "Round_phase_idx"         ON "Round"("phase");
CREATE INDEX IF NOT EXISTS "Round_createdAt_idx"     ON "Round"("createdAt");
CREATE INDEX IF NOT EXISTS "Bet_round_user_idx"      ON "Bet"("roundId","userId");
CREATE INDEX IF NOT EXISTS "Bet_user_createdAt_idx"  ON "Bet"("userId","createdAt");

-- 舊名的輔助索引（如果你的查詢會用到，可留著）
CREATE INDEX IF NOT EXISTS "idx_bet_round_side"      ON "Bet"("roundId","side");
CREATE INDEX IF NOT EXISTS "idx_bet_user_createdAt"  ON "Bet"("userId","createdAt");

------------------------------------------------------------
-- 4) （可選）補齊 unique/constraint（若之前有）
--    例：同房同日 roundSeq 唯一
------------------------------------------------------------
DO $$
BEGIN
  -- 如果沒有這個唯一約束才建立
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Round_room_day_seq_unique'
  ) THEN
    EXECUTE 'ALTER TABLE "Round"
             ADD CONSTRAINT "Round_room_day_seq_unique"
             UNIQUE ("roomId","day","roundSeq")';
  END IF;
END$$;

COMMIT;
