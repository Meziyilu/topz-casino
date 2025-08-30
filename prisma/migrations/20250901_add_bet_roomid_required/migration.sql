-- prisma/migrations/20250901_add_bet_roomid_required/migration.sql
-- Migration: add required roomId to Bet
-- Date: 2025-09-01

-- 1) 新增欄位（先允許為 NULL，避免舊資料阻塞）
ALTER TABLE "Bet" ADD COLUMN "roomId" TEXT;

-- 2) 回填：透過 Round 找對應房間
UPDATE "Bet" b
SET "roomId" = r."roomId"
FROM "Round" r
WHERE b."roundId" = r."id" AND b."roomId" IS NULL;

-- 3) 檢查是否還有沒回填成功的資料
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Bet" WHERE "roomId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill of Bet.roomId failed: some rows still NULL';
  END IF;
END $$;

-- 4) 設為 NOT NULL
ALTER TABLE "Bet" ALTER COLUMN "roomId" SET NOT NULL;

-- 5) 外鍵 & 索引
ALTER TABLE "Bet"
  ADD CONSTRAINT "Bet_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "Bet_roomId_idx" ON "Bet"("roomId");
