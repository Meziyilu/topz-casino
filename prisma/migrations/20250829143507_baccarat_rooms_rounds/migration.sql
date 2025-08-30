-- ==========================================================
-- Fix: Ensure enum value 'TRANSFER' exists before usage
-- ==========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'LedgerType'
      AND e.enumlabel = 'TRANSFER'
  ) THEN
    ALTER TYPE "LedgerType" ADD VALUE 'TRANSFER';
  END IF;
END $$;

-- ==========================================================
-- Create new enums for baccarat game
-- ==========================================================
CREATE TYPE "BalanceTarget" AS ENUM ('WALLET', 'BANK');

CREATE TYPE "RoomCode" AS ENUM ('R30', 'R60', 'R90');

CREATE TYPE "RoundPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

CREATE TYPE "RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

CREATE TYPE "BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR');

-- ==========================================================
-- Room table
-- ==========================================================
CREATE TABLE "Room" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" "RoomCode" NOT NULL,
    "name" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- unique index for room code
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- ==========================================================
-- Round table
-- ==========================================================
CREATE TABLE "Round" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "roomId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "roundSeq" INTEGER NOT NULL,
    "phase" "RoundPhase" NOT NULL DEFAULT 'BETTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    -- Results
    "outcome" "RoundOutcome",
    "playerTotal" INTEGER,
    "bankerTotal" INTEGER,
    "playerPair" BOOLEAN,
    "bankerPair" BOOLEAN,
    "anyPair" BOOLEAN,
    "perfectPair" BOOLEAN,
    "playerCards" JSONB,
    "bankerCards" JSONB,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Round" ADD CONSTRAINT "Round_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- unique index: same room, same day, roundSeq
CREATE UNIQUE INDEX "Round_roomId_day_roundSeq_key"
  ON "Round"("roomId", "day", "roundSeq");

CREATE INDEX "Round_roomId_day_roundSeq_idx" ON "Round"("roomId", "day", "roundSeq");
CREATE INDEX "Round_phase_idx" ON "Round"("phase");
CREATE INDEX "Round_createdAt_idx" ON "Round"("createdAt");

-- ==========================================================
-- Bet table
-- ==========================================================
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roomId" TEXT, -- optional, 可為 NULL
    "side" "BetSide" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey"
FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Bet_roundId_userId_idx" ON "Bet"("roundId", "userId");
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");
