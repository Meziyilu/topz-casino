-- CreateEnum
CREATE TYPE "public"."HeadframeCode" AS ENUM ('NONE', 'GOLD', 'NEON', 'CRYSTAL', 'DRAGON');

-- CreateEnum
CREATE TYPE "public"."PanelPreset" AS ENUM ('GLASS_LIGHT', 'GLASS_DARK', 'NEON_PURPLE', 'AURORA', 'CYBERPUNK');

-- CreateEnum
CREATE TYPE "public"."ProfileModuleCode" AS ENUM ('AVATAR_FRAME', 'BASIC_INFO', 'BADGES', 'STATS', 'QUICK_ACTIONS', 'PERSONA_TAGS', 'COLLECTIONS', 'ACHIEVE_PROGRESS', 'FRIENDS', 'EVENTS', 'WALL', 'RARE_SHOWCASE', 'EDITOR', 'AI_RECO', 'VIP_PERKS', 'HISTORY', 'FEED');

-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'BET_PLACED', 'PAYOUT', 'ADMIN_ADJUST', 'CHECKIN_BONUS', 'EVENT_REWARD', 'TOPUP_BONUS', 'EXTERNAL_TOPUP');

-- CreateEnum
CREATE TYPE "public"."BalanceTarget" AS ENUM ('WALLET', 'BANK');

-- CreateEnum
CREATE TYPE "public"."StatPeriod" AS ENUM ('DAILY', 'WEEKLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "public"."RewardCampaignKind" AS ENUM ('EVENT', 'TOPUP');

-- CreateEnum
CREATE TYPE "public"."PopupTrigger" AS ENUM ('LOGIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."ChatMessageType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."GameCode" AS ENUM ('GLOBAL', 'BACCARAT', 'LOTTO', 'SICBO');

-- CreateEnum
CREATE TYPE "public"."RoomCode" AS ENUM ('R30', 'R60', 'R90');

-- CreateEnum
CREATE TYPE "public"."RoundPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

-- CreateEnum
CREATE TYPE "public"."BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR', 'ANY_PAIR', 'PERFECT_PAIR', 'BANKER_SUPER_SIX');

-- CreateEnum
CREATE TYPE "public"."SicBoRoomCode" AS ENUM ('SB_R30', 'SB_R60', 'SB_R90');

-- CreateEnum
CREATE TYPE "public"."SicBoPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."SicBoBetKind" AS ENUM ('BIG', 'SMALL', 'ODD', 'EVEN', 'ANY_TRIPLE', 'SPECIFIC_TRIPLE', 'SPECIFIC_DOUBLE', 'TOTAL', 'COMBINATION', 'SINGLE_DIE');

-- CreateEnum
CREATE TYPE "public"."TailParity" AS ENUM ('ODD', 'EVEN');

-- CreateEnum
CREATE TYPE "public"."TailSize" AS ENUM ('BIG', 'SMALL');

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
    "nickname" TEXT,
    "about" TEXT,
    "country" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "vipTier" INTEGER NOT NULL DEFAULT 0,
    "vipExpireAt" TIMESTAMP(3),
    "headframe" "public"."HeadframeCode" NOT NULL DEFAULT 'NONE',
    "panelStyle" "public"."PanelPreset" NOT NULL DEFAULT 'GLASS_DARK',
    "panelTint" TEXT,
    "publicSlug" TEXT,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "totalStaked" BIGINT NOT NULL DEFAULT 0,
    "totalPayout" BIGINT NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "netProfit" BIGINT NOT NULL DEFAULT 0,
    "weeklyNetProfit" BIGINT NOT NULL DEFAULT 0,
    "favoriteGame" TEXT,
    "displayName" TEXT NOT NULL,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "registeredIp" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "referralCode" TEXT,
    "inviterId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."LedgerType" NOT NULL,
    "target" "public"."BalanceTarget" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT,
    "room" "public"."RoomCode",
    "sicboRoundId" TEXT,
    "sicboRoom" "public"."SicBoRoomCode",

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameConfig" (
    "id" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "key" TEXT NOT NULL,
    "valueString" TEXT,
    "valueInt" INTEGER,
    "valueFloat" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfileSettings" (
    "userId" TEXT NOT NULL,
    "layoutJson" JSONB,
    "bgImageUrl" TEXT,
    "bgBlur" INTEGER NOT NULL DEFAULT 10,
    "bgDim" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfileSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."UserProfileModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "public"."ProfileModuleCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfileModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "animated" BOOLEAN NOT NULL DEFAULT false,
    "desc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "target" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPersonaTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPersonaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Collectible" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Collectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCollectible" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectibleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCollectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rank" INTEGER,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WallPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WallPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WallComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WallComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WallLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarqueeMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarqueeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Round" (
    "id" TEXT NOT NULL,
    "room" "public"."RoomCode" NOT NULL,
    "phase" "public"."RoundPhase" NOT NULL,
    "outcome" "public"."RoundOutcome",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "day" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "shoeJson" TEXT NOT NULL,
    "resultJson" TEXT,
    "dealerId" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "side" "public"."BetSide" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LottoDraw" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "drawAt" TIMESTAMP(3) NOT NULL,
    "numbers" INTEGER[],
    "special" INTEGER,
    "pool" INTEGER NOT NULL DEFAULT 0,
    "jackpot" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daySeq" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LottoDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LottoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "picks" INTEGER[],
    "special" INTEGER,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tailParity" "public"."TailParity",
    "tailSize" "public"."TailSize",

    CONSTRAINT "LottoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SicBoRound" (
    "id" TEXT NOT NULL,
    "room" "public"."SicBoRoomCode" NOT NULL,
    "phase" "public"."SicBoPhase" NOT NULL,
    "dice" INTEGER[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "dealerId" TEXT,

    CONSTRAINT "SicBoRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SicBoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "kind" "public"."SicBoBetKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SicBoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserStatSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "public"."StatPeriod" NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "room" "public"."RoomCode",
    "gameBet" BIGINT NOT NULL DEFAULT 0,
    "gamePayout" BIGINT NOT NULL DEFAULT 0,
    "bonusIncome" BIGINT NOT NULL DEFAULT 0,
    "betsCount" INTEGER NOT NULL DEFAULT 0,
    "winsCount" INTEGER NOT NULL DEFAULT 0,
    "lossesCount" INTEGER NOT NULL DEFAULT 0,
    "netProfit" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStatSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCheckinState" (
    "userId" TEXT NOT NULL,
    "lastClaimedYmd" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "totalClaims" INTEGER NOT NULL DEFAULT 0,
    "nextAvailableAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCheckinState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."DailyCheckinClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ymd" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "streakBefore" INTEGER NOT NULL,
    "streakAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckinClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RewardCampaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "public"."RewardCampaignKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "popupTrigger" "public"."PopupTrigger" NOT NULL DEFAULT 'LOGIN',
    "autoPopup" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "coinAmount" INTEGER NOT NULL DEFAULT 0,
    "claimOnce" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "minTopupAmount" INTEGER,
    "topupSince" TIMESTAMP(3),
    "topupUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RewardClaim" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromoImpression" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalTopup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "provider" TEXT,
    "refCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalTopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ChatMessageType" NOT NULL DEFAULT 'USER',
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerifyToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifyToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicSlug_key" ON "public"."User"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "public"."User"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode");

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "public"."Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_type_createdAt_idx" ON "public"."Ledger"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_room_createdAt_idx" ON "public"."Ledger"("room", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_roundId_idx" ON "public"."Ledger"("roundId");

-- CreateIndex
CREATE INDEX "Ledger_sicboRoom_createdAt_idx" ON "public"."Ledger"("sicboRoom", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_sicboRoundId_idx" ON "public"."Ledger"("sicboRoundId");

-- CreateIndex
CREATE INDEX "GameConfig_gameCode_key_idx" ON "public"."GameConfig"("gameCode", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GameConfig_gameCode_key_key" ON "public"."GameConfig"("gameCode", "key");

-- CreateIndex
CREATE INDEX "UserProfileModule_userId_sortOrder_idx" ON "public"."UserProfileModule"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileModule_userId_code_key" ON "public"."UserProfileModule"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "public"."Badge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_userId_pinned_idx" ON "public"."UserBadge"("userId", "pinned");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "public"."UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "public"."Achievement"("code");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlocked_idx" ON "public"."UserAchievement"("userId", "unlocked");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "public"."UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaTag_userId_tag_key" ON "public"."UserPersonaTag"("userId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_code_key" ON "public"."Collectible"("code");

-- CreateIndex
CREATE INDEX "UserCollectible_userId_favorite_idx" ON "public"."UserCollectible"("userId", "favorite");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectible_userId_collectibleId_key" ON "public"."UserCollectible"("userId", "collectibleId");

-- CreateIndex
CREATE INDEX "Friendship_userAId_idx" ON "public"."Friendship"("userAId");

-- CreateIndex
CREATE INDEX "Friendship_userBId_idx" ON "public"."Friendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "public"."Friendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "EventParticipation_userId_eventId_idx" ON "public"."EventParticipation"("userId", "eventId");

-- CreateIndex
CREATE INDEX "WallPost_userId_createdAt_idx" ON "public"."WallPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WallComment_postId_createdAt_idx" ON "public"."WallComment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WallLike_postId_userId_key" ON "public"."WallLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "Round_room_startedAt_idx" ON "public"."Round"("room", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Round_room_day_seq_key" ON "public"."Round"("room", "day", "seq");

-- CreateIndex
CREATE INDEX "Bet_roundId_side_idx" ON "public"."Bet"("roundId", "side");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "public"."Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LottoDraw_day_daySeq_idx" ON "public"."LottoDraw"("day", "daySeq");

-- CreateIndex
CREATE UNIQUE INDEX "LottoDraw_day_daySeq_key" ON "public"."LottoDraw"("day", "daySeq");

-- CreateIndex
CREATE INDEX "LottoBet_userId_createdAt_idx" ON "public"."LottoBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LottoBet_drawId_idx" ON "public"."LottoBet"("drawId");

-- CreateIndex
CREATE INDEX "LottoBet_drawId_tailParity_idx" ON "public"."LottoBet"("drawId", "tailParity");

-- CreateIndex
CREATE INDEX "LottoBet_drawId_tailSize_idx" ON "public"."LottoBet"("drawId", "tailSize");

-- CreateIndex
CREATE INDEX "SicBoBet_roundId_kind_idx" ON "public"."SicBoBet"("roundId", "kind");

-- CreateIndex
CREATE INDEX "SicBoBet_userId_createdAt_idx" ON "public"."SicBoBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_period_room_windowStart_netProfit_idx" ON "public"."UserStatSnapshot"("period", "room", "windowStart", "netProfit");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_userId_period_room_idx" ON "public"."UserStatSnapshot"("userId", "period", "room");

-- CreateIndex
CREATE UNIQUE INDEX "UserStatSnapshot_userId_period_windowStart_windowEnd_room_key" ON "public"."UserStatSnapshot"("userId", "period", "windowStart", "windowEnd", "room");

-- CreateIndex
CREATE INDEX "DailyCheckinClaim_userId_createdAt_idx" ON "public"."DailyCheckinClaim"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckinClaim_userId_ymd_key" ON "public"."DailyCheckinClaim"("userId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCampaign_code_key" ON "public"."RewardCampaign"("code");

-- CreateIndex
CREATE INDEX "RewardCampaign_enabled_priority_idx" ON "public"."RewardCampaign"("enabled", "priority");

-- CreateIndex
CREATE INDEX "RewardCampaign_kind_startAt_endAt_idx" ON "public"."RewardCampaign"("kind", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "RewardClaim_userId_createdAt_idx" ON "public"."RewardClaim"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_campaignId_userId_key" ON "public"."RewardClaim"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "PromoImpression_userId_campaignId_shownAt_idx" ON "public"."PromoImpression"("userId", "campaignId", "shownAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalTopup_refCode_key" ON "public"."ExternalTopup"("refCode");

-- CreateIndex
CREATE INDEX "ExternalTopup_userId_createdAt_idx" ON "public"."ExternalTopup"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_room_createdAt_idx" ON "public"."ChatMessage"("room", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "public"."ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_userId_key" ON "public"."EmailVerifyToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_token_key" ON "public"."EmailVerifyToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "public"."PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfileSettings" ADD CONSTRAINT "UserProfileSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfileModule" ADD CONSTRAINT "UserProfileModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPersonaTag" ADD CONSTRAINT "UserPersonaTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCollectible" ADD CONSTRAINT "UserCollectible_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "public"."Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCollectible" ADD CONSTRAINT "UserCollectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventParticipation" ADD CONSTRAINT "EventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WallPost" ADD CONSTRAINT "WallPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WallComment" ADD CONSTRAINT "WallComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WallComment" ADD CONSTRAINT "WallComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WallLike" ADD CONSTRAINT "WallLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WallLike" ADD CONSTRAINT "WallLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LottoBet" ADD CONSTRAINT "LottoBet_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "public"."LottoDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LottoBet" ADD CONSTRAINT "LottoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SicBoRound" ADD CONSTRAINT "SicBoRound_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SicBoBet" ADD CONSTRAINT "SicBoBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."SicBoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SicBoBet" ADD CONSTRAINT "SicBoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStatSnapshot" ADD CONSTRAINT "UserStatSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCheckinState" ADD CONSTRAINT "UserCheckinState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyCheckinClaim" ADD CONSTRAINT "DailyCheckinClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardClaim" ADD CONSTRAINT "RewardClaim_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."RewardCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoImpression" ADD CONSTRAINT "PromoImpression_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."RewardCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoImpression" ADD CONSTRAINT "PromoImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalTopup" ADD CONSTRAINT "ExternalTopup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerifyToken" ADD CONSTRAINT "EmailVerifyToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
