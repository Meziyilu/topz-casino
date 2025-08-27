-- CreateEnum
CREATE TYPE "public"."BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR', 'ANY_PAIR', 'PERFECT_PAIR');

-- CreateEnum
CREATE TYPE "public"."RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

-- CreateEnum
CREATE TYPE "public"."RoundPhase" AS ENUM ('BETTING', 'REVEAL', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."RoomCode" AS ENUM ('R30', 'R60', 'R90');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "code" "public"."RoomCode" NOT NULL,
    "name" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Round" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "roundSeq" INTEGER NOT NULL,
    "phase" "public"."RoundPhase" NOT NULL DEFAULT 'BETTING',
    "outcome" "public"."RoundOutcome",
    "playerTotal" INTEGER,
    "bankerTotal" INTEGER,
    "playerCards" JSONB,
    "bankerCards" JSONB,
    "playerPair" BOOLEAN,
    "bankerPair" BOOLEAN,
    "anyPair" BOOLEAN,
    "perfectPair" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "roundSeq" INTEGER NOT NULL,
    "side" "public"."BetSide" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "public"."Room"("code");

-- CreateIndex
CREATE INDEX "Room_code_idx" ON "public"."Room"("code");

-- CreateIndex
CREATE INDEX "Round_roomId_day_idx" ON "public"."Round"("roomId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roomId_day_roundSeq_key" ON "public"."Round"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Bet_userId_roomId_createdAt_idx" ON "public"."Bet"("userId", "roomId", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_roomId_day_roundSeq_idx" ON "public"."Bet"("roomId", "day", "roundSeq");

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
