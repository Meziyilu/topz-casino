-- CreateEnum
CREATE TYPE "public"."ShopItemKind" AS ENUM ('HEADFRAME', 'BADGE', 'BUNDLE', 'CURRENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ShopCurrency" AS ENUM ('COIN', 'DIAMOND', 'TICKET', 'GACHA_TICKET');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."BalanceTarget" ADD VALUE 'DIAMOND';
ALTER TYPE "public"."BalanceTarget" ADD VALUE 'TICKET';
ALTER TYPE "public"."BalanceTarget" ADD VALUE 'GACHA_TICKET';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."LedgerType" ADD VALUE 'SHOP_PURCHASE';
ALTER TYPE "public"."LedgerType" ADD VALUE 'EXCHANGE';

-- AlterTable
ALTER TABLE "public"."Ledger" ADD COLUMN     "meta" JSONB;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "diamondBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gachaTicketBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."UserHeadframe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "public"."HeadframeCode" NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserHeadframe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopItem" (
    "id" TEXT NOT NULL,
    "kind" "public"."ShopItemKind" NOT NULL,
    "currency" "public"."ShopCurrency" NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "basePrice" INTEGER NOT NULL,
    "vipDiscountable" BOOLEAN NOT NULL DEFAULT true,
    "limitedQty" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopSku" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "vipDiscountableOverride" BOOLEAN,
    "currencyOverride" "public"."ShopCurrency",
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopBundleEntry" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ShopBundleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "pricePaid" INTEGER NOT NULL,
    "vipDiscountRate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'SHOP',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountRule" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "targetCode" TEXT,
    "vipMin" INTEGER,
    "percentOff" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHeadframe_userId_expiresAt_idx" ON "public"."UserHeadframe"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserHeadframe_userId_code_key" ON "public"."UserHeadframe"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_code_key" ON "public"."ShopItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPurchase_idempotencyKey_key" ON "public"."ShopPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_createdAt_idx" ON "public"."ShopPurchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopPurchase_skuId_idx" ON "public"."ShopPurchase"("skuId");

-- AddForeignKey
ALTER TABLE "public"."UserHeadframe" ADD CONSTRAINT "UserHeadframe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopSku" ADD CONSTRAINT "ShopSku_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopBundleEntry" ADD CONSTRAINT "ShopBundleEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopBundleEntry" ADD CONSTRAINT "ShopBundleEntry_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ShopSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ShopSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
