-- CreateEnum
CREATE TYPE "public"."HeadframeCode" AS ENUM ('NONE', 'GOLD', 'NEON', 'CRYSTAL', 'DRAGON');

-- CreateEnum
CREATE TYPE "public"."PanelPreset" AS ENUM ('GLASS_LIGHT', 'GLASS_DARK', 'NEON_PURPLE', 'AURORA', 'CYBERPUNK');

-- CreateEnum
CREATE TYPE "public"."ProfileModuleCode" AS ENUM ('ABOUT', 'STATS', 'BADGES', 'INVENTORY');

-- CreateEnum
CREATE TYPE "public"."ChatMessageType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'BET_PLACED', 'PAYOUT', 'ADMIN_ADJUST', 'CHECKIN_BONUS', 'EVENT_REWARD', 'TOPUP_BONUS', 'EXTERNAL_TOPUP', 'SHOP_PURCHASE', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "public"."BalanceTarget" AS ENUM ('WALLET', 'BANK', 'DIAMOND', 'TICKET', 'GACHA_TICKET');

-- CreateEnum
CREATE TYPE "public"."GameCode" AS ENUM ('GLOBAL', 'BACCARAT', 'LOTTO', 'SICBO', 'ROULETTE', 'HORSE', 'FIVE_MINUTE', 'SLOTS', 'BLACKJACK');

-- CreateEnum
CREATE TYPE "public"."StatPeriod" AS ENUM ('DAILY', 'WEEKLY', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "public"."RewardCampaignKind" AS ENUM ('EVENT', 'TOPUP');

-- CreateEnum
CREATE TYPE "public"."PopupTrigger" AS ENUM ('LOGIN', 'MANUAL');

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

-- CreateEnum
CREATE TYPE "public"."RouletteRoomCode" AS ENUM ('RL_R30', 'RL_R60', 'RL_R90');

-- CreateEnum
CREATE TYPE "public"."RouletteBetKind" AS ENUM ('STRAIGHT', 'SPLIT', 'STREET', 'CORNER', 'LINE', 'DOZEN', 'COLUMN', 'RED_BLACK', 'ODD_EVEN', 'LOW_HIGH');

-- CreateEnum
CREATE TYPE "public"."HorseTrackCode" AS ENUM ('TURF_DIRT_SPRINT', 'TURF_DIRT_CLASSIC', 'TURF_LONG');

-- CreateEnum
CREATE TYPE "public"."HorseBetKind" AS ENUM ('WIN', 'PLACE', 'SHOW', 'EXACTA', 'TRIFECTA', 'QUINELLA');

-- CreateEnum
CREATE TYPE "public"."FiveRoomCode" AS ENUM ('FM_R5', 'FM_R10');

-- CreateEnum
CREATE TYPE "public"."FiveBetKind" AS ENUM ('BIG', 'SMALL', 'ODD', 'EVEN', 'SUM_RANGE', 'POSITION_PICK');

-- CreateEnum
CREATE TYPE "public"."SlotRoomCode" AS ENUM ('SLOT_LOBBY', 'SLOT_VIP');

-- CreateEnum
CREATE TYPE "public"."BJTableRoomCode" AS ENUM ('BJ_TBL_R30', 'BJ_TBL_R60', 'BJ_TBL_R90');

-- CreateEnum
CREATE TYPE "public"."BJPhase" AS ENUM ('WAITING', 'BETTING', 'DEALING', 'PLAYER_ACTION', 'DEALER_ACTION', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."BJOutcome" AS ENUM ('PLAYER_WIN', 'DEALER_WIN', 'PUSH', 'SURRENDER', 'BLACKJACK');

-- CreateEnum
CREATE TYPE "public"."BJAction" AS ENUM ('HIT', 'STAND', 'DOUBLE', 'SPLIT', 'SURRENDER', 'INSURANCE');

-- CreateEnum
CREATE TYPE "public"."ShopItemKind" AS ENUM ('HEADFRAME', 'BADGE', 'BUNDLE', 'CURRENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ShopCurrency" AS ENUM ('COIN', 'DIAMOND', 'TICKET', 'GACHA_TICKET');

-- CreateEnum
CREATE TYPE "public"."InventoryItemType" AS ENUM ('HEADFRAME', 'BADGE', 'GIFT_CARD', 'COLLECTIBLE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."JackpotDrawStatus" AS ENUM ('PENDING', 'SELECTED', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."DirectMessageKind" AS ENUM ('TEXT', 'SYSTEM', 'PAYOUT_NOTICE', 'POPUP_NOTICE');

-- CreateEnum
CREATE TYPE "public"."BlockLevel" AS ENUM ('CHAT_ONLY', 'DM_ONLY', 'ALL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "name" TEXT,
    "nickname" TEXT,
    "about" TEXT,
    "country" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "registeredIp" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "vipTier" INTEGER NOT NULL DEFAULT 0,
    "vipExpireAt" TIMESTAMP(3),
    "favoriteGame" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "bankBalance" INTEGER NOT NULL DEFAULT 0,
    "diamondBalance" INTEGER NOT NULL DEFAULT 0,
    "ticketBalance" INTEGER NOT NULL DEFAULT 0,
    "gachaTicketBalance" INTEGER NOT NULL DEFAULT 0,
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
    "referralCode" TEXT,
    "inviterId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
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
    "meta" JSONB,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameConfig" (
    "id" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "key" TEXT NOT NULL,
    "valueString" TEXT,
    "valueInt" BIGINT,
    "valueFloat" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "json" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarqueeMessage" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),

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
CREATE TABLE "public"."RouletteRound" (
    "id" TEXT NOT NULL,
    "room" "public"."RouletteRoomCode" NOT NULL,
    "phase" "public"."SicBoPhase" NOT NULL,
    "result" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RouletteRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RouletteBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "kind" "public"."RouletteBetKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HorseRace" (
    "id" TEXT NOT NULL,
    "track" "public"."HorseTrackCode" NOT NULL,
    "phase" "public"."SicBoPhase" NOT NULL,
    "horses" JSONB NOT NULL,
    "result" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "HorseRace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HorseBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "kind" "public"."HorseBetKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorseBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiveMinuteDraw" (
    "id" TEXT NOT NULL,
    "room" "public"."FiveRoomCode" NOT NULL,
    "phase" "public"."SicBoPhase" NOT NULL,
    "numbers" INTEGER[],
    "drawAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "day" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "daySeq" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FiveMinuteDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FiveMinuteBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "kind" "public"."FiveBetKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiveMinuteBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlotMachine" (
    "id" TEXT NOT NULL,
    "room" "public"."SlotRoomCode" NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "reelsJson" JSONB NOT NULL,
    "linesJson" JSONB NOT NULL,
    "paytable" JSONB NOT NULL,
    "volatility" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlotSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "bet" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotSpin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackPersonalGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" "public"."BJPhase" NOT NULL,
    "shoeJson" JSONB NOT NULL,
    "dealerHand" JSONB NOT NULL,
    "playerHands" JSONB NOT NULL,
    "baseBet" INTEGER NOT NULL,
    "outcome" "public"."BJOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "BlackjackPersonalGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackTable" (
    "id" TEXT NOT NULL,
    "room" "public"."BJTableRoomCode" NOT NULL,
    "name" TEXT NOT NULL,
    "minBet" INTEGER NOT NULL DEFAULT 10,
    "maxBet" INTEGER NOT NULL DEFAULT 1000,
    "seatCount" INTEGER NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackjackTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackTableSeat" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "userId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "BlackjackTableSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackTableRound" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "phase" "public"."BJPhase" NOT NULL,
    "shoeJson" JSONB NOT NULL,
    "dealerHand" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "BlackjackTableRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackTableBet" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "sideBet" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackjackTableBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlackjackTableAction" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatNo" INTEGER NOT NULL,
    "action" "public"."BJAction" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackjackTableAction_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."Season" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "rulesJson" JSONB,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeasonLeaderboard" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JackpotPool" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "pool" BIGINT NOT NULL DEFAULT 0,
    "seed" BIGINT NOT NULL DEFAULT 0,
    "takeBps" INTEGER NOT NULL DEFAULT 300,
    "hitOdds" DOUBLE PRECISION NOT NULL DEFAULT 0.00001,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JackpotPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JackpotRule" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT,
    "takeBps" INTEGER NOT NULL DEFAULT 50,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JackpotRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JackpotContribution" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT,
    "userId" TEXT,
    "amount" BIGINT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JackpotContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JackpotDailyDraw" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "drawDate" TIMESTAMP(3) NOT NULL,
    "selectedUserId" TEXT,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "status" "public"."JackpotDrawStatus" NOT NULL DEFAULT 'PENDING',
    "ledgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "JackpotDailyDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BetLimit" (
    "id" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT,
    "minBet" INTEGER NOT NULL DEFAULT 1,
    "maxBet" INTEGER NOT NULL DEFAULT 100000,
    "perUserDailyMax" INTEGER,
    "cooldownMs" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameRtpSnapshot" (
    "id" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT,
    "window" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "betSum" BIGINT NOT NULL DEFAULT 0,
    "payoutSum" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRtpSnapshot_pkey" PRIMARY KEY ("id")
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
    "payloadJson" JSONB,
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

-- CreateTable
CREATE TABLE "public"."ShopInventory" (
    "itemId" TEXT NOT NULL,
    "totalQty" INTEGER,
    "soldQty" INTEGER NOT NULL DEFAULT 0,
    "lockedQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopInventory_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "public"."ShopStockLock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShopStockLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseLimitRule" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "targetCode" TEXT,
    "perUserDay" INTEGER,
    "perUserAll" INTEGER,
    "perSiteDay" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseLimitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseLimitUsage" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT,
    "ymd" TIMESTAMP(3) NOT NULL,
    "usedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseLimitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER,
    "amountOff" INTEGER,
    "maxUse" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromoRedemption" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopRefund" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Gift" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemAssetLink" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,

    CONSTRAINT "ItemAssetLink_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "public"."VoiceRoom" (
    "id" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VoiceRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VoiceParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "deafened" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VoiceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VoiceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "VoiceSession_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "public"."UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."InventoryItemType" NOT NULL,
    "refId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LobbyPopup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LobbyPopup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LobbyPopupAck" (
    "id" TEXT NOT NULL,
    "popupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "LobbyPopupAck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectThread" (
    "id" TEXT NOT NULL,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "DirectThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "kind" "public"."DirectMessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameCode" "public"."GameCode" NOT NULL,
    "roomKey" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "seatNo" INTEGER,
    "seatMeta" JSONB,

    CONSTRAINT "RoomPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TwoFactorSecret" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorSecret_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."RiskScore" (
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "reasons" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskScore_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."KycProfile" (
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "docImages" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,

    CONSTRAINT "KycProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."CashRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "CashRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ymd" TIMESTAMP(3) NOT NULL,
    "wallet" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "diamond" INTEGER NOT NULL DEFAULT 0,
    "ticket" INTEGER NOT NULL DEFAULT 0,
    "gacha" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeatureFlag" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Experiment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "variants" JSONB NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."I18nMessage" (
    "id" TEXT NOT NULL,
    "ns" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "I18nMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3),
    "tries" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventLog" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "userId" TEXT,
    "ref" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "nextRetry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ruleJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralPayout" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileVisit" (
    "id" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserKudos" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "UserKudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "level" "public"."BlockLevel" NOT NULL DEFAULT 'ALL',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "public"."User"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "User_publicSlug_key" ON "public"."User"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileModule_userId_code_key" ON "public"."UserProfileModule"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "public"."Badge"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "public"."UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "public"."Achievement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "public"."UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "Collectible_code_key" ON "public"."Collectible"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollectible_userId_collectibleId_key" ON "public"."UserCollectible"("userId", "collectibleId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "public"."Friendship"("userAId", "userBId");

-- CreateIndex
CREATE UNIQUE INDEX "WallLike_postId_userId_key" ON "public"."WallLike"("postId", "userId");

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
CREATE INDEX "RouletteRound_room_startedAt_idx" ON "public"."RouletteRound"("room", "startedAt");

-- CreateIndex
CREATE INDEX "RouletteBet_roundId_kind_idx" ON "public"."RouletteBet"("roundId", "kind");

-- CreateIndex
CREATE INDEX "RouletteBet_userId_createdAt_idx" ON "public"."RouletteBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HorseRace_track_startedAt_idx" ON "public"."HorseRace"("track", "startedAt");

-- CreateIndex
CREATE INDEX "HorseBet_raceId_kind_idx" ON "public"."HorseBet"("raceId", "kind");

-- CreateIndex
CREATE INDEX "HorseBet_userId_createdAt_idx" ON "public"."HorseBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FiveMinuteDraw_room_drawAt_idx" ON "public"."FiveMinuteDraw"("room", "drawAt");

-- CreateIndex
CREATE UNIQUE INDEX "FiveMinuteDraw_day_daySeq_room_key" ON "public"."FiveMinuteDraw"("day", "daySeq", "room");

-- CreateIndex
CREATE INDEX "FiveMinuteBet_drawId_kind_idx" ON "public"."FiveMinuteBet"("drawId", "kind");

-- CreateIndex
CREATE INDEX "FiveMinuteBet_userId_createdAt_idx" ON "public"."FiveMinuteBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SlotSpin_userId_createdAt_idx" ON "public"."SlotSpin"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SlotSpin_machineId_createdAt_idx" ON "public"."SlotSpin"("machineId", "createdAt");

-- CreateIndex
CREATE INDEX "BlackjackPersonalGame_userId_createdAt_idx" ON "public"."BlackjackPersonalGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BlackjackTable_active_idx" ON "public"."BlackjackTable"("active");

-- CreateIndex
CREATE UNIQUE INDEX "BlackjackTable_room_name_key" ON "public"."BlackjackTable"("room", "name");

-- CreateIndex
CREATE INDEX "BlackjackTableSeat_tableId_userId_idx" ON "public"."BlackjackTableSeat"("tableId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BlackjackTableSeat_tableId_seatNo_key" ON "public"."BlackjackTableSeat"("tableId", "seatNo");

-- CreateIndex
CREATE INDEX "BlackjackTableRound_tableId_startedAt_idx" ON "public"."BlackjackTableRound"("tableId", "startedAt");

-- CreateIndex
CREATE INDEX "BlackjackTableBet_roundId_userId_idx" ON "public"."BlackjackTableBet"("roundId", "userId");

-- CreateIndex
CREATE INDEX "BlackjackTableAction_roundId_userId_createdAt_idx" ON "public"."BlackjackTableAction"("roundId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_period_room_windowStart_netProfit_idx" ON "public"."UserStatSnapshot"("period", "room", "windowStart", "netProfit");

-- CreateIndex
CREATE INDEX "UserStatSnapshot_userId_period_room_idx" ON "public"."UserStatSnapshot"("userId", "period", "room");

-- CreateIndex
CREATE UNIQUE INDEX "UserStatSnapshot_userId_period_windowStart_windowEnd_room_key" ON "public"."UserStatSnapshot"("userId", "period", "windowStart", "windowEnd", "room");

-- CreateIndex
CREATE UNIQUE INDEX "Season_code_key" ON "public"."Season"("code");

-- CreateIndex
CREATE INDEX "SeasonLeaderboard_seasonId_score_idx" ON "public"."SeasonLeaderboard"("seasonId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonLeaderboard_seasonId_userId_key" ON "public"."SeasonLeaderboard"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "JackpotPool_code_key" ON "public"."JackpotPool"("code");

-- CreateIndex
CREATE INDEX "JackpotRule_active_idx" ON "public"."JackpotRule"("active");

-- CreateIndex
CREATE UNIQUE INDEX "JackpotRule_poolId_gameCode_roomKey_key" ON "public"."JackpotRule"("poolId", "gameCode", "roomKey");

-- CreateIndex
CREATE INDEX "JackpotContribution_poolId_createdAt_idx" ON "public"."JackpotContribution"("poolId", "createdAt");

-- CreateIndex
CREATE INDEX "JackpotContribution_gameCode_roomKey_createdAt_idx" ON "public"."JackpotContribution"("gameCode", "roomKey", "createdAt");

-- CreateIndex
CREATE INDEX "JackpotContribution_userId_createdAt_idx" ON "public"."JackpotContribution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JackpotDailyDraw_status_drawDate_idx" ON "public"."JackpotDailyDraw"("status", "drawDate");

-- CreateIndex
CREATE INDEX "JackpotDailyDraw_selectedUserId_idx" ON "public"."JackpotDailyDraw"("selectedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "JackpotDailyDraw_poolId_drawDate_key" ON "public"."JackpotDailyDraw"("poolId", "drawDate");

-- CreateIndex
CREATE UNIQUE INDEX "BetLimit_gameCode_roomKey_key" ON "public"."BetLimit"("gameCode", "roomKey");

-- CreateIndex
CREATE INDEX "GameRtpSnapshot_gameCode_windowStart_idx" ON "public"."GameRtpSnapshot"("gameCode", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "GameRtpSnapshot_gameCode_roomKey_window_windowStart_windowE_key" ON "public"."GameRtpSnapshot"("gameCode", "roomKey", "window", "windowStart", "windowEnd");

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
CREATE UNIQUE INDEX "ShopItem_code_key" ON "public"."ShopItem"("code");

-- CreateIndex
CREATE INDEX "ShopItem_currency_visible_startAt_endAt_idx" ON "public"."ShopItem"("currency", "visible", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ShopSku_itemId_createdAt_idx" ON "public"."ShopSku"("itemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPurchase_idempotencyKey_key" ON "public"."ShopPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_createdAt_idx" ON "public"."ShopPurchase"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopPurchase_skuId_idx" ON "public"."ShopPurchase"("skuId");

-- CreateIndex
CREATE INDEX "ShopStockLock_itemId_expiresAt_released_idx" ON "public"."ShopStockLock"("itemId", "expiresAt", "released");

-- CreateIndex
CREATE INDEX "PurchaseLimitRule_scope_targetCode_enabled_startAt_endAt_idx" ON "public"."PurchaseLimitRule"("scope", "targetCode", "enabled", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "PurchaseLimitUsage_ruleId_ymd_idx" ON "public"."PurchaseLimitUsage"("ruleId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseLimitUsage_ruleId_userId_ymd_key" ON "public"."PurchaseLimitUsage"("ruleId", "userId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "public"."PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoRedemption_userId_usedAt_idx" ON "public"."PromoRedemption"("userId", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoRedemption_codeId_userId_key" ON "public"."PromoRedemption"("codeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRefund_purchaseId_key" ON "public"."ShopRefund"("purchaseId");

-- CreateIndex
CREATE INDEX "Gift_receiverId_openedAt_idx" ON "public"."Gift"("receiverId", "openedAt");

-- CreateIndex
CREATE INDEX "Gift_senderId_createdAt_idx" ON "public"."Gift"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_code_key" ON "public"."MediaAsset"("code");

-- CreateIndex
CREATE INDEX "ItemAssetLink_itemId_purpose_idx" ON "public"."ItemAssetLink"("itemId", "purpose");

-- CreateIndex
CREATE INDEX "ChatMessage_room_createdAt_idx" ON "public"."ChatMessage"("room", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "public"."ChatMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceRoom_active_idx" ON "public"."VoiceRoom"("active");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceRoom_gameCode_roomKey_key" ON "public"."VoiceRoom"("gameCode", "roomKey");

-- CreateIndex
CREATE INDEX "VoiceParticipant_roomId_joinedAt_idx" ON "public"."VoiceParticipant"("roomId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceParticipant_roomId_userId_key" ON "public"."VoiceParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "VoiceSession_roomId_joinedAt_idx" ON "public"."VoiceSession"("roomId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_userId_key" ON "public"."EmailVerifyToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerifyToken_token_key" ON "public"."EmailVerifyToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "public"."PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "UserInventory_userId_type_idx" ON "public"."UserInventory"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_type_refId_key" ON "public"."UserInventory"("userId", "type", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPopup_code_key" ON "public"."LobbyPopup"("code");

-- CreateIndex
CREATE INDEX "LobbyPopup_enabled_startAt_endAt_priority_idx" ON "public"."LobbyPopup"("enabled", "startAt", "endAt", "priority");

-- CreateIndex
CREATE INDEX "LobbyPopupAck_userId_shownAt_idx" ON "public"."LobbyPopupAck"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "DirectThread_lastMessageAt_idx" ON "public"."DirectThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "DirectParticipant_userId_joinedAt_idx" ON "public"."DirectParticipant"("userId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectParticipant_threadId_userId_key" ON "public"."DirectParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "public"."DirectMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "public"."DirectMessage"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_kind_createdAt_idx" ON "public"."DirectMessage"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "DirectReadReceipt_userId_readAt_idx" ON "public"."DirectReadReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectReadReceipt_messageId_userId_key" ON "public"."DirectReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX "RoomPresence_gameCode_roomKey_joinedAt_idx" ON "public"."RoomPresence"("gameCode", "roomKey", "joinedAt");

-- CreateIndex
CREATE INDEX "RoomPresence_userId_leftAt_idx" ON "public"."RoomPresence"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "RoomPresence_gameCode_roomKey_seatNo_idx" ON "public"."RoomPresence"("gameCode", "roomKey", "seatNo");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "public"."Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PushToken_userId_createdAt_idx" ON "public"."PushToken"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_provider_token_key" ON "public"."PushToken"("provider", "token");

-- CreateIndex
CREATE INDEX "UserDevice_userId_lastSeenAt_idx" ON "public"."UserDevice"("userId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "public"."UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_revokedAt_idx" ON "public"."UserSession"("userId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "CashRequest_userId_status_createdAt_idx" ON "public"."CashRequest"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_ymd_idx" ON "public"."BalanceSnapshot"("ymd");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceSnapshot_userId_ymd_key" ON "public"."BalanceSnapshot"("userId", "ymd");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_code_key" ON "public"."FeatureFlag"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_code_key" ON "public"."Experiment"("code");

-- CreateIndex
CREATE INDEX "ExperimentAssignment_userId_assignedAt_idx" ON "public"."ExperimentAssignment"("userId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentAssignment_experimentId_userId_key" ON "public"."ExperimentAssignment"("experimentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "I18nMessage_ns_key_locale_key" ON "public"."I18nMessage"("ns", "key", "locale");

-- CreateIndex
CREATE INDEX "Job_code_status_runAt_idx" ON "public"."Job"("code", "status", "runAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "public"."AdminAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceWindow_code_key" ON "public"."MaintenanceWindow"("code");

-- CreateIndex
CREATE INDEX "WebhookEvent_endpoint_status_idx" ON "public"."WebhookEvent"("endpoint", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralRule_code_key" ON "public"."ReferralRule"("code");

-- CreateIndex
CREATE INDEX "ReferralPayout_inviterId_createdAt_idx" ON "public"."ReferralPayout"("inviterId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralPayout_inviteeId_createdAt_idx" ON "public"."ReferralPayout"("inviteeId", "createdAt");

-- CreateIndex
CREATE INDEX "Follow_followeeId_createdAt_idx" ON "public"."Follow"("followeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followeeId_key" ON "public"."Follow"("followerId", "followeeId");

-- CreateIndex
CREATE INDEX "ProfileVisit_profileUserId_visitedAt_idx" ON "public"."ProfileVisit"("profileUserId", "visitedAt");

-- CreateIndex
CREATE INDEX "ProfileVisit_viewerUserId_visitedAt_idx" ON "public"."ProfileVisit"("viewerUserId", "visitedAt");

-- CreateIndex
CREATE INDEX "PostMedia_postId_idx" ON "public"."PostMedia"("postId");

-- CreateIndex
CREATE INDEX "UserKudos_toUserId_createdAt_idx" ON "public"."UserKudos"("toUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserKudos_fromUserId_createdAt_idx" ON "public"."UserKudos"("fromUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserKudos_fromUserId_toUserId_key" ON "public"."UserKudos"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "public"."UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "public"."UserBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedId_key" ON "public"."UserBlock"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "public"."UserCollectible" ADD CONSTRAINT "UserCollectible_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "public"."Collectible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCollectible" ADD CONSTRAINT "UserCollectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."Ledger" ADD CONSTRAINT "Ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."RouletteBet" ADD CONSTRAINT "RouletteBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."RouletteRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RouletteBet" ADD CONSTRAINT "RouletteBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HorseBet" ADD CONSTRAINT "HorseBet_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "public"."HorseRace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HorseBet" ADD CONSTRAINT "HorseBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiveMinuteBet" ADD CONSTRAINT "FiveMinuteBet_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "public"."FiveMinuteDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FiveMinuteBet" ADD CONSTRAINT "FiveMinuteBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlotSpin" ADD CONSTRAINT "SlotSpin_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."SlotMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlotSpin" ADD CONSTRAINT "SlotSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackPersonalGame" ADD CONSTRAINT "BlackjackPersonalGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableSeat" ADD CONSTRAINT "BlackjackTableSeat_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."BlackjackTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableSeat" ADD CONSTRAINT "BlackjackTableSeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableRound" ADD CONSTRAINT "BlackjackTableRound_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "public"."BlackjackTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableBet" ADD CONSTRAINT "BlackjackTableBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."BlackjackTableRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableBet" ADD CONSTRAINT "BlackjackTableBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableAction" ADD CONSTRAINT "BlackjackTableAction_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."BlackjackTableRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlackjackTableAction" ADD CONSTRAINT "BlackjackTableAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStatSnapshot" ADD CONSTRAINT "UserStatSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JackpotRule" ADD CONSTRAINT "JackpotRule_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."JackpotPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JackpotContribution" ADD CONSTRAINT "JackpotContribution_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."JackpotPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JackpotContribution" ADD CONSTRAINT "JackpotContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JackpotDailyDraw" ADD CONSTRAINT "JackpotDailyDraw_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."JackpotPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JackpotDailyDraw" ADD CONSTRAINT "JackpotDailyDraw_selectedUserId_fkey" FOREIGN KEY ("selectedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "public"."ShopSku" ADD CONSTRAINT "ShopSku_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopBundleEntry" ADD CONSTRAINT "ShopBundleEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopBundleEntry" ADD CONSTRAINT "ShopBundleEntry_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ShopSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ShopSku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopInventory" ADD CONSTRAINT "ShopInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopStockLock" ADD CONSTRAINT "ShopStockLock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopStockLock" ADD CONSTRAINT "ShopStockLock_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "public"."ShopSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseLimitUsage" ADD CONSTRAINT "PurchaseLimitUsage_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."PurchaseLimitRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoRedemption" ADD CONSTRAINT "PromoRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "public"."PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopRefund" ADD CONSTRAINT "ShopRefund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."ShopPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gift" ADD CONSTRAINT "Gift_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gift" ADD CONSTRAINT "Gift_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Gift" ADD CONSTRAINT "Gift_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "public"."ShopPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemAssetLink" ADD CONSTRAINT "ItemAssetLink_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemAssetLink" ADD CONSTRAINT "ItemAssetLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoiceParticipant" ADD CONSTRAINT "VoiceParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoiceParticipant" ADD CONSTRAINT "VoiceParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoiceSession" ADD CONSTRAINT "VoiceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoiceSession" ADD CONSTRAINT "VoiceSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."VoiceRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerifyToken" ADD CONSTRAINT "EmailVerifyToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LobbyPopupAck" ADD CONSTRAINT "LobbyPopupAck_popupId_fkey" FOREIGN KEY ("popupId") REFERENCES "public"."LobbyPopup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LobbyPopupAck" ADD CONSTRAINT "LobbyPopupAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectParticipant" ADD CONSTRAINT "DirectParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectParticipant" ADD CONSTRAINT "DirectParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."DirectThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectReadReceipt" ADD CONSTRAINT "DirectReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectReadReceipt" ADD CONSTRAINT "DirectReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomPresence" ADD CONSTRAINT "RoomPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TwoFactorSecret" ADD CONSTRAINT "TwoFactorSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RiskScore" ADD CONSTRAINT "RiskScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashRequest" ADD CONSTRAINT "CashRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralPayout" ADD CONSTRAINT "ReferralPayout_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralPayout" ADD CONSTRAINT "ReferralPayout_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followeeId_fkey" FOREIGN KEY ("followeeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileVisit" ADD CONSTRAINT "ProfileVisit_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileVisit" ADD CONSTRAINT "ProfileVisit_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."WallPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserKudos" ADD CONSTRAINT "UserKudos_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserKudos" ADD CONSTRAINT "UserKudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
