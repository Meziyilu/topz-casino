-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'BET_PLACED', 'PAYOUT', 'TRANSFER', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "public"."BalanceTarget" AS ENUM ('WALLET', 'BANK');

-- CreateEnum
CREATE TYPE "public"."RoomCode" AS ENUM ('R30', 'R60', 'R90');

-- CreateEnum
CREATE TYPE "public"."RoundPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

-- CreateEnum
CREATE TYPE "public"."BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "bankBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."LedgerType" NOT NULL,
    "target" "public"."BalanceTarget" NOT NULL,
    "delta" INTEGER NOT NULL,
    "memo" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "bankAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "outcome" "public"."RoundOutcome",
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

-- CreateTable
CREATE TABLE "public"."Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "side" "public"."BetSide" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarqueeMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarqueeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "reward" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "public"."Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_type_createdAt_idx" ON "public"."Ledger"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "public"."Room"("code");

-- CreateIndex
CREATE INDEX "Round_roomId_day_roundSeq_idx" ON "public"."Round"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Round_phase_idx" ON "public"."Round"("phase");

-- CreateIndex
CREATE INDEX "Round_createdAt_idx" ON "public"."Round"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roomId_day_roundSeq_key" ON "public"."Round"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Bet_roomId_idx" ON "public"."Bet"("roomId");

-- CreateIndex
CREATE INDEX "Bet_roundId_userId_idx" ON "public"."Bet"("roundId", "userId");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "public"."Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_enabled_createdAt_idx" ON "public"."Announcement"("enabled", "createdAt");

-- CreateIndex
CREATE INDEX "MarqueeMessage_enabled_priority_createdAt_idx" ON "public"."MarqueeMessage"("enabled", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "DailyCheckin_userId_day_idx" ON "public"."DailyCheckin"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckin_userId_day_key" ON "public"."DailyCheckin"("userId", "day");

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyCheckin" ADD CONSTRAINT "DailyCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
