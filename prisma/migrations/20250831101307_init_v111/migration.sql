-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('ADMIN_ADJUST', 'TRANSFER_IN', 'TRANSFER_OUT', 'BET_PLACED', 'BET_PAYOUT');

-- CreateEnum
CREATE TYPE "public"."BalanceTarget" AS ENUM ('WALLET', 'BANK');

-- CreateEnum
CREATE TYPE "public"."RoomCode" AS ENUM ('R30', 'R60', 'R90');

-- CreateEnum
CREATE TYPE "public"."RoundPhase" AS ENUM ('BETTING', 'REVEAL', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

-- CreateEnum
CREATE TYPE "public"."BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR', 'ANY_PAIR', 'PERFECT_PAIR');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "bankBalance" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "type" "public"."LedgerType" NOT NULL,
    "target" "public"."BalanceTarget" NOT NULL,
    "delta" INTEGER NOT NULL,
    "memo" TEXT,
    "balanceAfter" INTEGER,
    "bankAfter" INTEGER,
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
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "public"."User"("isAdmin");

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "public"."Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_adminId_idx" ON "public"."Ledger"("adminId");

-- CreateIndex
CREATE INDEX "Ledger_type_target_idx" ON "public"."Ledger"("type", "target");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "public"."Room"("code");

-- CreateIndex
CREATE INDEX "Room_code_idx" ON "public"."Room"("code");

-- CreateIndex
CREATE INDEX "Round_roomId_day_idx" ON "public"."Round"("roomId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roomId_day_roundSeq_key" ON "public"."Round"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Bet_roomId_day_roundSeq_idx" ON "public"."Bet"("roomId", "day", "roundSeq");

-- CreateIndex
CREATE INDEX "Bet_userId_roomId_createdAt_idx" ON "public"."Bet"("userId", "roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
