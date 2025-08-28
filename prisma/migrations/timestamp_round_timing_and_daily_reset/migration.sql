-- prisma/migrations/<timestamp>_round_timing_and_daily_reset/migration.sql

-- 保障 gen_random_uuid() 可用
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1) 建立/校正 ENUM 類型
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoomCode') THEN
    CREATE TYPE "RoomCode" AS ENUM ('R30','R60','R90');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundPhase') THEN
    CREATE TYPE "RoundPhase" AS ENUM ('BETTING','REVEAL','SETTLED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundOutcome') THEN
    CREATE TYPE "RoundOutcome" AS ENUM ('PLAYER','BANKER','TIE');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BetSide') THEN
    CREATE TYPE "BetSide" AS ENUM ('PLAYER','BANKER','TIE','PLAYER_PAIR','BANKER_PAIR','ANY_PAIR','PERFECT_PAIR');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LedgerType') THEN
    CREATE TYPE "LedgerType" AS ENUM ('BET_PLACED','BET_PAYOUT','TRANSFER','ADMIN_ADJUST');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BalanceTarget') THEN
    CREATE TYPE "BalanceTarget" AS ENUM ('WALLET','BANK');
  END IF;
END$$;

-- =========================
-- 2) 修補/新增欄位：User
-- =========================
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isAdmin"      boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdAt"    timestamp(3) without time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "balance"      integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bankBalance"  integer   NOT NULL DEFAULT 0;

-- =========================
-- 3) 修補/新增欄位：Room
-- =========================
-- code 欄位改為 enum（若目前是 text，需你自行確認資料）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Room' AND column_name='code'
  ) THEN
    ALTER TABLE "Room" ADD COLUMN "code" "RoomCode";
  END IF;
END$$;

ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "name"            text      NOT NULL DEFAULT '未命名房間',
  ADD COLUMN IF NOT EXISTS "durationSeconds" integer   NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS "createdAt"       timestamp(3) without time zone NOT NULL DEFAULT now();

-- 保證 code 唯一索引
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='Room_code_key') THEN
    CREATE UNIQUE INDEX "Room_code_key" ON "Room" ("code");
  END IF;
END$$;

-- =========================
-- 4) 修補/新增欄位：Round（重點）
-- =========================
ALTER TABLE "Round"
  ADD COLUMN IF NOT EXISTS "roundSeq"     integer       NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "phase"        "RoundPhase"  NOT NULL DEFAULT 'BETTING',
  ADD COLUMN IF NOT EXISTS "outcome"      "RoundOutcome",
  ADD COLUMN IF NOT EXISTS "createdAt"    timestamp(3) without time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "startedAt"    timestamp(3) without time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "settledAt"    timestamp(3) without time zone,
  ADD COLUMN IF NOT EXISTS "playerTotal"  integer,
  ADD COLUMN IF NOT EXISTS "bankerTotal"  integer,
  ADD COLUMN IF NOT EXISTS "playerCards"  jsonb,
  ADD COLUMN IF NOT EXISTS "bankerCards"  jsonb,
  ADD COLUMN IF NOT EXISTS "playerPair"   boolean,
  ADD COLUMN IF NOT EXISTS "bankerPair"   boolean,
  ADD COLUMN IF NOT EXISTS "anyPair"      boolean,
  ADD COLUMN IF NOT EXISTS "perfectPair"  boolean;

-- 產生欄位：dayLocal（台北日），僅在不存在時建立
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Round' AND column_name='dayLocal'
  ) THEN
    EXECUTE 'ALTER TABLE "Round" ADD COLUMN "dayLocal" date GENERATED ALWAYS AS (("startedAt" + interval ''8 hours'')::date) STORED';
  END IF;
END$$;

-- 移除舊唯一鍵 (roomId, roundSeq) 若存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uniq_round_room_seq') THEN
    EXECUTE 'DROP INDEX "uniq_round_room_seq"';
  END IF;
END$$;

-- 新索引 & 唯一鍵（每日重置）
CREATE INDEX IF NOT EXISTS "idx_round_room_createdAt"  ON "Round" ("roomId","createdAt");
CREATE INDEX IF NOT EXISTS "idx_round_room_startedAt"  ON "Round" ("roomId","startedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_round_room_day_seq" ON "Round" ("roomId","dayLocal","roundSeq");

-- =========================
-- 5) 修補/新增欄位：Bet
-- =========================
ALTER TABLE "Bet"
  ADD COLUMN IF NOT EXISTS "side"      "BetSide",
  ADD COLUMN IF NOT EXISTS "amount"    integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdAt" timestamp(3) without time zone NOT NULL DEFAULT now();

-- 索引
CREATE INDEX IF NOT EXISTS "idx_bet_round_side"   ON "Bet" ("roundId","side");
CREATE INDEX IF NOT EXISTS "idx_bet_round_user"   ON "Bet" ("roundId","userId");
CREATE INDEX IF NOT EXISTS "idx_bet_user_created" ON "Bet" ("userId","createdAt");

-- =========================
-- 6) 修補/新增欄位：Ledger
-- =========================
ALTER TABLE "Ledger"
  ADD COLUMN IF NOT EXISTS "type"          "LedgerType",
  ADD COLUMN IF NOT EXISTS "target"        "BalanceTarget",
  ADD COLUMN IF NOT EXISTS "delta"         integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "memo"          text,
  ADD COLUMN IF NOT EXISTS "balanceAfter"  integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bankAfter"     integer   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "createdAt"     timestamp(3) without time zone NOT NULL DEFAULT now();

-- 索引
CREATE INDEX IF NOT EXISTS "idx_ledger_user_created" ON "Ledger" ("userId","createdAt");
