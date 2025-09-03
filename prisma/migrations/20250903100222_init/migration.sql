-- CreateEnum
CREATE TYPE "HeadframeCode" AS ENUM ('NONE', 'GOLD', 'NEON', 'CRYSTAL', 'DRAGON');

-- CreateEnum
CREATE TYPE "PanelPreset" AS ENUM ('GLASS_LIGHT', 'GLASS_DARK', 'NEON_PURPLE', 'AURORA', 'CYBERPUNK');

-- CreateEnum
CREATE TYPE "ProfileModuleCode" AS ENUM ('AVATAR_FRAME', 'BASIC_INFO', 'BADGES', 'STATS', 'QUICK_ACTIONS', 'PERSONA_TAGS', 'COLLECTIONS', 'ACHIEVE_PROGRESS', 'FRIENDS', 'EVENTS', 'WALL', 'RARE_SHOWCASE', 'EDITOR', 'AI_RECO', 'VIP_PERKS', 'HISTORY', 'FEED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'BET_PLACED', 'PAYOUT', 'ADMIN_ADJUST', 'CHECKIN_BONUS', 'EVENT_REWARD', 'TOPUP_BONUS', 'EXTERNAL_TOPUP');

-- CreateEnum
CREATE TYPE "BalanceTarget" AS ENUM ('WALLET', 'BANK');

-- CreateEnum
CREATE TYPE "StatPeriod" AS ENUM ('DAILY', 'WEEKLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "RewardCampaignKind" AS ENUM ('EVENT', 'TOPUP');

-- CreateEnum
CREATE TYPE "PopupTrigger" AS ENUM ('LOGIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GameCode" AS ENUM ('GLOBAL', 'BACCARAT', 'LOTTO', 'SICBO');

-- CreateEnum
CREATE TYPE "RoomCode" AS ENUM ('R30', 'R60', 'R90');

-- CreateEnum
CREATE TYPE "RoundPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

-- CreateEnum
CREATE TYPE "RoundOutcome" AS ENUM ('PLAYER', 'BANKER', 'TIE');

-- CreateEnum
CREATE TYPE "BetSide" AS ENUM ('PLAYER', 'BANKER', 'TIE', 'PLAYER_PAIR', 'BANKER_PAIR', 'ANY_PAIR', 'PERFECT_PAIR', 'BANKER_SUPER_SIX');

-- CreateEnum
CREATE TYPE "SicBoRoomCode" AS ENUM ('SB_R30', 'SB_R60', 'SB_R90');

-- CreateEnum
CREATE TYPE "SicBoPhase" AS ENUM ('BETTING', 'REVEALING', 'SETTLED');

-- CreateEnum
CREATE TYPE "SicBoBetKind" AS ENUM ('BIG', 'SMALL', 'ODD', 'EVEN', 'ANY_TRIPLE', 'SPECIFIC_TRIPLE', 'SPECIFIC_DOUBLE', 'TOTAL', 'COMBINATION', 'SINGLE_DIE');

-- CreateTable
CREATE TABLE "User" (
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
    "headframe" "HeadframeCode" NOT NULL DEFAULT 'NONE',
    "panelStyle" "PanelPreset" NOT NULL DEFAULT 'GLASS_DARK',
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
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "target" "BalanceTarget" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT,
    "room" "RoomCode",
    "sicboRoundId" TEXT,
    "sicboRoom" "SicBoRoomCode",

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL,
    "gameCode" "GameCode" NOT NULL,
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
CREATE TABLE "UserProfileSettings" (
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
CREATE TABLE "UserProfileModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "ProfileModuleCode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfileModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
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
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "target" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPersonaTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPersonaTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collectible" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Collectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollectible" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectibleId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCollectible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rank" INTEGER,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallPost" (
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
CREATE TABLE "WallComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WallComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarqueeMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarqueeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "room" "RoomCode" NOT NULL,
    "phase" "RoundPhase" NOT NULL,
    "outcome" "RoundOutcome",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "dealerId" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "side" "BetSide" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LottoDraw" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "drawAt" TIMESTAMP(3) NOT NULL,
    "numbers" INTEGER[],
    "special" INTEGER,
    "pool" INTEGER NOT NULL DEFAULT 0,
    "jackpot" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LottoDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LottoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "picks" INTEGER[],
    "special" INTEGER,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LottoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SicBoRound" (
    "id" TEXT NOT NULL,
    "room" "SicBoRoomCode" NOT NULL,
    "phase" "SicBoPhase" NOT NULL,
    "dice" INTEGER[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "dealerId" TEXT,

    CONSTRAINT "SicBoRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SicBoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "kind" "SicBoBetKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SicBoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStatSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "StatPeriod" NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "room" "RoomCode",
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
CREATE TABLE "UserCheckinState" (
    "userId" TEXT NOT NULL,
    "lastClaimedYmd" TIMESTAMP(3),
    "streak" INTEGER NOT NULL DEFAULT 0,
    "totalClaims" INTEGER NOT NULL DEFAULT 0,
    "nextAvailableAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCheckinState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DailyCheckinClaim" (
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
CREATE TABLE "RewardCampaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "RewardCampaignKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "popupTrigger" "PopupTrigger" NOT NULL DEFAULT 'LOGIN',
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
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoImpression" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalTopup" (
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
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'USER',
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerifyToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerifyToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicSlug_key" ON "User"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "Ledger_userId_createdAt_idx" ON "Ledger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_type_createdAt_idx" ON "Ledger"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_room_createdAt_idx" ON "Ledger"("room", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_roundId_idx" ON "Ledger"("roundId");

-- CreateIndex
CREATE INDEX "Ledger_sicboRoom_createdAt_idx" ON "Ledger"("sicboRoom", "createdAt");

-- CreateIndex
CREATE INDEX "Ledger_sicboRoundId_idx" ON "Ledger"("sicboRoundId");

-- CreateIndex
CREATE INDEX "GameConfig_gameCode_key_idx" ON "GameConfig"("gameCode", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GameConfig_gameCode_key_key" ON "GameConfig"("gameCode", "key");

-- CreateIndex
CREATE INDEX "UserProfileModule_userId_sortOrder_idx" ON "UserProfileModule"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileModule_userId_code_key" ON "UserProfileModule"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_userId_pinned_idx" ON "UserBadge"("userId", "pinned");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_unlocked_idx" ON "UserAchievement"("userId", "unlocked");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaTag_userId_tag_key" ON "UserPersonaTag"("userId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_code_key" ON "Collectible"("code");

-- CreateIndex
CREATE INDEX "UserCollectible_userId_favorite_idx" ON "UserCollectible"("userId", "favorite");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectible_userId_collectibleId_key" ON "UserCollectible"("userId", "collectibleId");

-- CreateIndex
CREATE INDEX "Friendship_userAId_idx" ON "Friendship"("userAId");

-- CreateIndex
CREATE INDEX "Friendship_userBId_idx" ON "Friendship"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "EventParticipation_userId_eventId_idx" ON "EventParticipation"("userId", "eventId");

-- CreateIndex
CREATE INDEX "WallPost_userId_createdAt_idx" ON "WallPost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WallComment_postId_createdAt_idx" ON "WallComment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WallLike_postId_userId_key" ON "WallLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "Bet_roundId_side_idx" ON "Bet"("roundId", "side");

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LottoBet_userId_createdAt_idx" ON "LottoBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LottoBet_drawId_idx" ON "LottoBet"("drawId");

-- CreateIndex
CREATE INDEX "SicBoBet_roundId_kind_idx" ON "SicBoBet"("roundId", "kind");

-- CreateIndex
CREATE INDEX "SicBoBet_userId_createdAt_idx" ON "SicBoBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_period_room_windowStart_netProfit_idx" ON "UserStatSnapshot"("period", "room", "windowStart", "netProfit");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_userId_period_room_idx" ON "UserStatSnapshot"("userId", "period", "room");

-- CreateIndex
CREATE UNIQUE INDEX "UserStatSnapshot_userId_period_windowStart_windowEnd_room_key" ON "UserStatSnapshot"("userId", "period", "windowStart", "windowEnd", "room");

-- CreateIndex
CREATE INDEX "DailyCheckinClaim_userId_createdAt_idx" ON "DailyCheckinClaim"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckinClaim_userId_ymd_key" ON "DailyCheckinClaim"("userId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCampaign_code_key" ON "RewardCampaign"("code");

-- CreateIndex
CREATE INDEX "RewardCampaign_enabled_priority_idx" ON "RewardCampaign"("enabled", "priority");

-- CreateIndex
CREATE INDEX "RewardCampaign_kind_startAt_endAt_idx" ON "RewardCampaign"("kind", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "RewardClaim_userId_createdAt_idx" ON "RewardClaim"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_campaignId_userId_key" ON "RewardClaim"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "PromoImpression_userId_campaignId_shownAt_idx" ON "PromoImpression"("userId", "campaignId", "shownAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalTopup_refCode_key" ON "ExternalTopup"("refCode");

-- CreateIndex
CREATE INDEX "ExternalTopup_userId_createdAt_idx" ON "ExternalTopup"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_room_createdAt_idx" ON "ChatMessage"("room", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_userId_key" ON "EmailVerifyToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_token_key" ON "EmailVerifyToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileSettings" ADD CONSTRAINT "UserProfileSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileModule" ADD CONSTRAINT "UserProfileModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaTag" ADD CONSTRAINT "UserPersonaTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectible" ADD CONSTRAINT "UserCollectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectible" ADD CONSTRAINT "UserCollectible_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallPost" ADD CONSTRAINT "WallPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallComment" ADD CONSTRAINT "WallComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallComment" ADD CONSTRAINT "WallComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallLike" ADD CONSTRAINT "WallLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallLike" ADD CONSTRAINT "WallLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LottoBet" ADD CONSTRAINT "LottoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LottoBet" ADD CONSTRAINT "LottoBet_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "LottoDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicBoRound" ADD CONSTRAINT "SicBoRound_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicBoBet" ADD CONSTRAINT "SicBoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SicBoBet" ADD CONSTRAINT "SicBoBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SicBoRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStatSnapshot" ADD CONSTRAINT "UserStatSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCheckinState" ADD CONSTRAINT "UserCheckinState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckinClaim" ADD CONSTRAINT "DailyCheckinClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RewardCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoImpression" ADD CONSTRAINT "PromoImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoImpression" ADD CONSTRAINT "PromoImpression_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RewardCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTopup" ADD CONSTRAINT "ExternalTopup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerifyToken" ADD CONSTRAINT "EmailVerifyToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
