-- CreateEnum
CREATE TYPE "public"."LottoRoundStatus" AS ENUM ('OPEN', 'LOCKED', 'DRAWN', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."LottoBetKind" AS ENUM ('PICKS', 'SPECIAL_ODD', 'SPECIAL_EVEN', 'BALL_ATTR');

-- CreateEnum
CREATE TYPE "public"."LottoAttr" AS ENUM ('BIG', 'SMALL', 'ODD', 'EVEN');

-- CreateEnum
CREATE TYPE "public"."BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."LottoRound" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "drawAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."LottoRoundStatus" NOT NULL DEFAULT 'OPEN',
    "numbers" INTEGER[],
    "special" INTEGER,
    "pool" INTEGER NOT NULL DEFAULT 0,
    "jackpot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LottoRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LottoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "kind" "public"."LottoBetKind" NOT NULL,
    "picks" INTEGER[],
    "picksKey" TEXT NOT NULL DEFAULT '-',
    "ballIndex" INTEGER,
    "attr" "public"."LottoAttr",
    "amount" INTEGER NOT NULL,
    "status" "public"."BetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "hitSpecial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LottoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "LottoRound_code_key" ON "public"."LottoRound"("code");

-- CreateIndex
CREATE INDEX "LottoBet_roundId_idx" ON "public"."LottoBet"("roundId");

-- CreateIndex
CREATE INDEX "LottoBet_userId_idx" ON "public"."LottoBet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LottoBet_userId_roundId_kind_picksKey_key" ON "public"."LottoBet"("userId", "roundId", "kind", "picksKey");

-- CreateIndex
CREATE UNIQUE INDEX "LottoBet_userId_roundId_kind_ballIndex_attr_key" ON "public"."LottoBet"("userId", "roundId", "kind", "ballIndex", "attr");

-- AddForeignKey
ALTER TABLE "public"."LottoBet" ADD CONSTRAINT "LottoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LottoBet" ADD CONSTRAINT "LottoBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."LottoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
