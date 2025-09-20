/* prisma/seed.ts */
import {
  PrismaClient,
  // 可能存在的列舉（若你的 schema 名稱不同，會用 fallback）
  HeadframeCode as _HeadframeCode,
  PanelPreset as _PanelPreset,
  GameCode as _GameCode,
  // 這些有可能在你的 schema 中命名不同；下方有 fallback 保護
  // BJTableRoomCode as _BJTableRoomCode,
  // SlotRoomCode as _SlotRoomCode,
  // RouletteRoomCode as _RouletteRoomCode,
  // DirectMessageKind as _DirectMessageKind,
  ShopItemKind as _ShopItemKind,
  ShopCurrency as _ShopCurrency,
} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

/** 安全取得 enum 值：若 enum 不存在或缺值，回傳字串 fallback（避免種子中斷） */
function pickEnum<T extends Record<string, any>>(
  enumObj: T | undefined,
  key: string,
  fallback: string
): any {
  if (enumObj && Object.prototype.hasOwnProperty.call(enumObj, key)) {
    return (enumObj as any)[key];
  }
  return fallback;
}

/** 判斷某個 model delegate 是否存在於 Prisma Client（避免 undefined.create 之類錯誤） */
function hasModel(name: keyof PrismaClient) {
  const anyPrisma = prisma as any;
  return !!anyPrisma[name];
}

/** 亂數推介碼 */
function makeReferralCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function upsertHeadframeItemWithSkus(opts: {
  code: string;
  title: string;
  headframeKey: string; // e.g. 'NEON'
  imageUrl?: string | null;
  desc?: string | null;
}) {
  if (!hasModel("shopItem") || !hasModel("shopSku")) {
    console.warn("⚠️  跳過 Shop：shopItem 或 shopSku model 不存在於 Client。");
    return;
  }

  const ShopItemKind = _ShopItemKind ?? ({} as any);
  const ShopCurrency = _ShopCurrency ?? ({} as any);

  const item = await prisma.shopItem.upsert({
    where: { code: opts.code },
    update: {
      title: opts.title,
      description: opts.desc ?? null,
      imageUrl: opts.imageUrl ?? null,
      visible: true,
    },
    create: {
      // 若 enum 不存在，fallback 用字串（Prisma 允許 enum 欄位以字串指定）
      kind: pickEnum(ShopItemKind, "HEADFRAME", "HEADFRAME"),
      currency: pickEnum(ShopCurrency, "DIAMOND", "DIAMOND"),
      code: opts.code,
      title: opts.title,
      description: opts.desc ?? null,
      imageUrl: opts.imageUrl ?? null,
      basePrice: 999,
      vipDiscountable: true,
      visible: true,
    },
  });

  // 兩個 SKU：7天 / 15天
  const skuSpecs = [
    { priceOverride: 999, durationDays: 7 },
    { priceOverride: 1999, durationDays: 15 },
  ];

  for (const spec of skuSpecs) {
    const payload = { kind: "HEADFRAME", headframe: opts.headframeKey, durationDays: spec.durationDays };
    const exist = await prisma.shopSku.findFirst({
      where: {
        itemId: item.id,
        currencyOverride: pickEnum(ShopCurrency, "DIAMOND", "DIAMOND"),
        payloadJson: { equals: payload },
      },
    });

    if (exist) {
      await prisma.shopSku.update({
        where: { id: exist.id },
        data: {
          priceOverride: spec.priceOverride,
          currencyOverride: pickEnum(ShopCurrency, "DIAMOND", "DIAMOND"),
          vipDiscountableOverride: true,
          payloadJson: payload,
        },
      });
    } else {
      await prisma.shopSku.create({
        data: {
          itemId: item.id,
          priceOverride: spec.priceOverride,
          currencyOverride: pickEnum(ShopCurrency, "DIAMOND", "DIAMOND"),
          vipDiscountableOverride: true,
          payloadJson: payload,
        },
      });
    }
  }
}

async function main() {
  console.log("🌱 Seeding v1.1.3 (TS)...");

  // ====== 準備 enum fallback ======
  const HeadframeCode = _HeadframeCode ?? ({} as any);
  const PanelPreset = _PanelPreset ?? ({} as any);
  const GameCode = _GameCode ?? ({} as any);
  // const BJTableRoomCode = _BJTableRoomCode ?? ({} as any);
  // const SlotRoomCode = _SlotRoomCode ?? ({} as any);
  // const RouletteRoomCode = _RouletteRoomCode ?? ({} as any);
  // const DirectMessageKind = _DirectMessageKind ?? ({} as any);

  // ====== 1) 管理員 + Demo 玩家 ======
  const adminPwd = await argon2.hash("Admin@123456");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPwd,
      displayName: "Admin",
      name: "Topz Admin",
      isAdmin: true,
      balance: 0,
      bankBalance: 0,
      referralCode: makeReferralCode(),
      avatarUrl: "https://picsum.photos/seed/admin/200/200",
      headframe: pickEnum(HeadframeCode, "GOLD", "GOLD"),
      panelStyle: pickEnum(PanelPreset, "GLASS_DARK", "GLASS_DARK"),
    },
  });

  const userPwd = await argon2.hash("P@ssw0rd!");
  const demo = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      password: userPwd,
      displayName: "玩家_001",
      name: "Demo User",
      referralCode: makeReferralCode(),
      avatarUrl: "https://picsum.photos/seed/demo/200/200",
      headframe: pickEnum(HeadframeCode, "NEON", "NEON"),
      panelStyle: pickEnum(PanelPreset, "AURORA", "AURORA"),
      balance: 5000,
      bankBalance: 10000,
    },
  });

  // ====== 2) 徽章 + 背包示範 ======
  if (hasModel("badge")) {
    const newbieBadge = await prisma.badge.upsert({
      where: { code: "NEWBIE" },
      update: {},
      create: { code: "NEWBIE", name: "Newbie", desc: "Welcome to Topzcasino!" },
    });

    if (hasModel("userBadge")) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: demo.id, badgeId: newbieBadge.id } },
        update: {},
        create: { userId: demo.id, badgeId: newbieBadge.id, pinned: true },
      });
    }

    // 若你的 schema 有 UserInventory，可解除註解
    // if (hasModel("userInventory")) {
    //   await prisma.userInventory.upsert({
    //     where: { userId_type_refId: { userId: demo.id, type: "BADGE", refId: newbieBadge.id } },
    //     update: { equipped: true },
    //     create: { userId: demo.id, type: "BADGE", refId: newbieBadge.id, equipped: true },
    //   });
    // }
  } else {
    console.warn("⚠️ 跳過 Badge/UserBadge：model 不存在。");
  }

  // ====== 3) 商城：頭框 + SKU ======
  await upsertHeadframeItemWithSkus({
    code: "HF_NEON",
    title: "霓虹旋律",
    headframeKey: "NEON",
    imageUrl: "/assets/shop/frames/neon.gif",
    desc: "華麗霓虹效果，超高存在感。",
  });
  await upsertHeadframeItemWithSkus({
    code: "HF_CRYSTAL",
    title: "水晶流光",
    headframeKey: "CRYSTAL",
    imageUrl: "/assets/shop/frames/crystal.gif",
    desc: "晶瑩剔透的環形流光特效。",
  });
  await upsertHeadframeItemWithSkus({
    code: "HF_DRAGON",
    title: "龍焰環",
    headframeKey: "DRAGON",
    imageUrl: "/assets/shop/frames/dragon.gif",
    desc: "龍紋火焰盤繞，霸氣登場。",
  });

  // 送禮（可選）
  if (hasModel("gift")) {
    await prisma.gift.create({
      data: { senderId: admin.id, receiverId: demo.id, message: "Welcome bonus!" },
    });
  } else {
    console.warn("⚠️ 跳過 Gift：model 不存在。");
  }

  // ====== 4) 大廳彈窗 ======
  if (hasModel("lobbyPopup")) {
    await prisma.lobbyPopup.upsert({
      where: { code: "WELCOME_POP" },
      update: {},
      create: {
        code: "WELCOME_POP",
        title: "歡迎來到 Topzcasino",
        body: "每日登入記得簽到並查看大廳公告！",
        priority: 100,
        enabled: true,
        dismissible: true,
      },
    });
  } else {
    console.warn("⚠️ 跳過 LobbyPopup：model 不存在。");
  }

  // ====== 5) 累積獎金池 + 規則（Blackjack 指定桌） ======
  if (hasModel("jackpotPool") && hasModel("jackpotRule")) {
    const mainPool = await prisma.jackpotPool.upsert({
      where: { code: "GLOBAL_MAIN" },
      update: {},
      create: {
        code: "GLOBAL_MAIN",
        gameCode: pickEnum(GameCode, "GLOBAL", "GLOBAL"),
        pool: BigInt(0),
        seed: BigInt(100000),
        takeBps: 50,
        hitOdds: 0.00001,
      },
    });

    await prisma.jackpotRule.upsert({
      where: {
        poolId_gameCode_roomKey: {
          poolId: mainPool.id,
          gameCode: pickEnum(GameCode, "BLACKJACK", "BLACKJACK"),
          roomKey: "BJ_TBL_R30:TableA",
        },
      },
      update: {},
      create: {
        poolId: mainPool.id,
        gameCode: pickEnum(GameCode, "BLACKJACK", "BLACKJACK"),
        roomKey: "BJ_TBL_R30:TableA",
        takeBps: 50,
        active: true,
      },
    });
  } else {
    console.warn("⚠️ 跳過 Jackpot（Pool/Rule）：model 不存在。");
  }

  // ====== 6) 語音房 + Blackjack 桌 + Presence 入座 ======
  if (hasModel("voiceRoom")) {
    await prisma.voiceRoom.upsert({
      where: { gameCode_roomKey: { gameCode: pickEnum(GameCode, "BLACKJACK", "BLACKJACK"), roomKey: "BJ_TBL_R30:TableA" } },
      update: {},
      create: { gameCode: pickEnum(GameCode, "BLACKJACK", "BLACKJACK"), roomKey: "BJ_TBL_R30:TableA", active: true },
    });
  } else {
    console.warn("⚠️ 跳過 VoiceRoom：model 不存在。");
  }

  if (hasModel("blackjackTable")) {
    // 若你的 schema 有複合 unique [room, name]，此 upsert where 要調整成實際 unique
    await prisma.blackjackTable.upsert({
      where: ({} as any), // 無法得知你的 unique 條件時，用 findFirst + create 替代：
      update: {},
      create: {
        // 下面兩行若你的 schema 用 enum，改成 pickEnum 對應
        room: "BJ_TBL_R30" as any,
        name: "TableA",
        minBet: 10,
        maxBet: 1000,
        seatCount: 7,
        active: true,
      },
    }).catch(async () => {
      // 若上面 upsert 失敗（因為 unique 條件不符），改成先查再 create
      const exist = await (prisma as any).blackjackTable.findFirst({ where: { name: "TableA" } });
      if (!exist) {
        await (prisma as any).blackjackTable.create({
          data: {
            room: "BJ_TBL_R30",
            name: "TableA",
            minBet: 10,
            maxBet: 1000,
            seatCount: 7,
            active: true,
          },
        });
      }
    });
  } else {
    console.warn("⚠️ 跳過 BlackjackTable：model 不存在。");
  }

  if (hasModel("roomPresence")) {
    await prisma.roomPresence.createMany({
      data: [{ userId: demo.id, gameCode: pickEnum(GameCode, "BLACKJACK", "BLACKJACK"), roomKey: "BJ_TBL_R30:TableA", seatNo: 1 }],
      skipDuplicates: true,
    });
  } else {
    console.warn("⚠️ 跳過 RoomPresence：model 不存在。");
  }

  // ====== 7) Slots 機台 + Roulette 範例回合 ======
  if (hasModel("slotMachine")) {
    await prisma.slotMachine.upsert({
      where: { name: "Fruit Bonanza" },
      update: {},
      create: {
        room: "SLOT_LOBBY" as any,
        name: "Fruit Bonanza",
        theme: "FRUIT",
        reelsJson: { reels: [[1, 2, 3], [1, 2, 3], [1, 2, 3]] },
        linesJson: { lines: [[0, 0, 0]] },
        paytable: { "1-1-1": 10, "2-2-2": 20, "3-3-3": 50 },
        volatility: 2,
        enabled: true,
      },
    });
  } else {
    console.warn("⚠️ 跳過 SlotMachine：model 不存在。");
  }

  if (hasModel("rouletteRound")) {
    await prisma.rouletteRound.create({
      data: {
        room: "RL_R30" as any,
        phase: "BETTING" as any,
        // 某些 schema 欄位名可能叫 result / outcome / number；這裡保留 null
        result: null as any,
      },
    });
  } else {
    console.warn("⚠️ 跳過 RouletteRound：model 不存在。");
  }

  // ====== 8) 私訊（管理員 -> Demo） ======
  if (hasModel("directThread") && hasModel("directParticipant") && hasModel("directMessage")) {
    const thread = await (prisma as any).directThread.create({ data: { topic: "Welcome & Payout Notices" } });
    await (prisma as any).directParticipant.createMany({
      data: [
        { threadId: thread.id, userId: admin.id, role: "ADMIN" },
        { threadId: thread.id, userId: demo.id, role: "USER" },
      ],
    });
    await (prisma as any).directMessage.create({
      data: {
        threadId: thread.id,
        senderId: admin.id,
        kind: "SYSTEM",
        body: "歡迎加入！有任何問題可直接回覆此訊息。",
        meta: { tags: ["welcome"] },
      },
    });
  } else {
    console.warn("⚠️ 跳過 DirectMessage 系列：model 不存在。");
  }

  console.log("✅ Seed TS done.");
}

main()
  .catch((e) => {
    console.error("❌ Seed TS failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
