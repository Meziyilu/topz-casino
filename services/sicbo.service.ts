// services/sicbo.service.ts
import prisma from "@/lib/prisma";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";

export type SicboRoomKey = "R30" | "R60" | "R90";

export type SicboBetIn =
  | { kind: "BIG_SMALL"; bigSmall: "BIG" | "SMALL"; amount: number }
  | { kind: "TOTAL"; totalSum: number; amount: number }
  | { kind: "SINGLE_FACE"; face: number; amount: number }
  | { kind: "DOUBLE_FACE"; face: number; amount: number }
  | { kind: "ANY_TRIPLE"; amount: number }
  | { kind: "SPECIFIC_TRIPLE"; face: number; amount: number }
  | { kind: "TWO_DICE_COMBO"; faceA: number; faceB: number; amount: number };

export type SicboStateDTO = {
  room: SicboRoomKey;
  serverTime: string;
  current: {
    roundId: string | null;
    day: string;
    daySeq: number;
    phase: "BETTING" | "LOCKED" | "SETTLED";
    startsAt: string;
    locksAt: string;
    settledAt: string | null;
  };
  config: {
    drawIntervalSec: number;
    lockBeforeRollSec: number;
    limits: {
      minBet: number;
      maxBet: number;
      perTypeMax: number;
      perRoundMax: number;
    };
    payoutTable: any;
  };
  exposure: Record<string, number>;
  history: Array<{
    daySeq: number;
    die1: number;
    die2: number;
    die3: number;
    sum: number;
    isTriple: boolean;
  }>;
  my: { balance: number; lastBets: any[] } | null;
};

export class SicboService {
  /**
   * 啟動三房回合循環，並回傳目前房態
   */
  static async getState(room: SicboRoomKey, userId?: string): Promise<SicboStateDTO> {
    await ensureRooms();
    const s = getRoomState(room);
    const cfg = getRoomConfig(room);
    if (!s || !cfg) {
      throw new Error("ROOM_NOT_READY");
    }

    // 近 50 局歷史
    const history = await prisma.sicboRound.findMany({
      where: { room },
      orderBy: { startsAt: "desc" },
      take: 50,
      select: { daySeq: true, die1: true, die2: true, die3: true, sum: true, isTriple: true },
    });

    let my: SicboStateDTO["my"] = null;
    if (userId && s.roundId) {
      const [me, lastBets] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
        prisma.sicboBet.findMany({
          where: { userId, roundId: s.roundId },
          orderBy: { placedAt: "desc" },
          take: 50,
        }),
      ]);
      my = { balance: me?.balance ?? 0, lastBets };
    }

    return {
      room,
      serverTime: new Date().toISOString(),
      current: {
        roundId: s.roundId,
        day: s.day,
        daySeq: s.daySeq,
        phase: s.phase,
        startsAt: s.startsAt,
        locksAt: s.locksAt,
        settledAt: s.settledAt,
      },
      config: {
        drawIntervalSec: cfg.drawIntervalSec,
        lockBeforeRollSec: cfg.lockBeforeRollSec,
        limits: cfg.limits,
        payoutTable: cfg.payout,
      },
      exposure: s.exposure,
      history,
      my,
    };
  }

  /**
   * 下注（支援批量）
   * - 檢查：房態、限紅、單局上限、餘額
   * - 扣款 + 建立注單（交易）
   */
  static async placeBets(room: SicboRoomKey, userId: string, bets: SicboBetIn[]) {
    if (!bets?.length) throw new Error("NO_BETS");

    await ensureRooms();
    const s = getRoomState(room);
    const cfg = getRoomConfig(room);
    if (!s || !cfg) throw new Error("ROOM_NOT_READY");
    if (s.phase !== "BETTING") throw new Error("NOT_IN_BETTING");

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true },
    });
    if (!me) throw new Error("USER_NOT_FOUND");

    // 限紅 / 金額
    let total = 0;
    for (const b of bets) {
      if (b.amount < cfg.limits.minBet) throw new Error("UNDER_MIN");
      if (b.amount > cfg.limits.maxBet) throw new Error("OVER_MAX");
      total += b.amount;

      // 基礎參數有效性
      if (b.kind === "TOTAL" && (b.totalSum < 4 || b.totalSum > 17)) throw new Error("BAD_TOTAL");
      if (
        (b.kind === "SINGLE_FACE" || b.kind === "DOUBLE_FACE" || b.kind === "SPECIFIC_TRIPLE") &&
        (b.face < 1 || b.face > 6)
      ) throw new Error("BAD_FACE");
      if (b.kind === "TWO_DICE_COMBO") {
        const a = Math.min(b.faceA, b.faceB), c = Math.max(b.faceA, b.faceB);
        if (a < 1 || c > 6 || a === c) throw new Error("BAD_COMBO");
      }
    }
    if (total > cfg.limits.perRoundMax) throw new Error("OVER_ROUND_LIMIT");
    if (me.balance < total) throw new Error("INSUFFICIENT_BALANCE");

    // 建單（交易）
    const result = await prisma.$transaction(async (tx) => {
      await tx.ledger.create({
        data: { type: "BET_PLACED", game: "SICBO", gameRef: s.roundId!, userId: me.id, amount: -total },
      });
      await tx.user.update({ where: { id: me.id }, data: { balance: { decrement: total } } });

      const toCreate = bets.map((b) => {
        const odds = (() => {
          switch (b.kind) {
            case "BIG_SMALL":
              return cfg.payout.bigSmall[b.bigSmall];
            case "TOTAL":
              return cfg.payout.total[b.totalSum];
            case "SINGLE_FACE":
              return 1; // 結算時按出現次數 x1/x2/x3
            case "DOUBLE_FACE":
              return cfg.payout.doubleFace;
            case "ANY_TRIPLE":
              return cfg.payout.anyTriple;
            case "SPECIFIC_TRIPLE":
              return cfg.payout.specificTriple;
            case "TWO_DICE_COMBO":
              return cfg.payout.twoDiceCombo;
          }
        })();

        const base: any = { userId: me.id, roundId: s.roundId!, amount: b.amount, odds };

        if (b.kind === "BIG_SMALL") return { ...base, kind: "BIG_SMALL", bigSmall: b.bigSmall };
        if (b.kind === "TOTAL") return { ...base, kind: "TOTAL", totalSum: b.totalSum };
        if (b.kind === "SINGLE_FACE") return { ...base, kind: "SINGLE_FACE", face: b.face };
        if (b.kind === "DOUBLE_FACE") return { ...base, kind: "DOUBLE_FACE", face: b.face };
        if (b.kind === "ANY_TRIPLE") return { ...base, kind: "ANY_TRIPLE" };
        if (b.kind === "SPECIFIC_TRIPLE") return { ...base, kind: "SPECIFIC_TRIPLE", face: b.face };
        if (b.kind === "TWO_DICE_COMBO")
          return { ...base, kind: "TWO_DICE_COMBO", faceA: Math.min(b.faceA, b.faceB), faceB: Math.max(b.faceA, b.faceB) };

        return base;
      });

      const created = await tx.sicboBet.createMany({ data: toCreate });
      return { createdCount: created.count, debited: total };
    });

    return { ok: true, ...result };
  }

  /**
   * 我的注單（逆序）
   */
  static async myBets(userId: string, limit = 50) {
    const items = await prisma.sicboBet.findMany({
      where: { userId },
      orderBy: [{ placedAt: "desc" }],
      take: Math.min(200, Math.max(1, limit)),
    });
    return { items };
  }

  /**
   * 歷史開獎（含骰子與總點）
   */
  static async history(room: SicboRoomKey, limit = 200) {
    const items = await prisma.sicboRound.findMany({
      where: { room },
      orderBy: { startsAt: "desc" },
      take: Math.min(500, Math.max(1, limit)),
      select: {
        daySeq: true,
        die1: true,
        die2: true,
        die3: true,
        sum: true,
        isTriple: true,
        startsAt: true,
      },
    });
    return { items };
  }

  /**
   * （預留）管理控制：封盤 / 指定骰面開獎 / 強制結算
   * NOTE：需配合 lib/sicbo/room.ts 暴露對應 hook，並加上審計/白名單。
   */
  static async adminControl(_params: { action: "lock" | "roll" | "settle"; room: SicboRoomKey; dice?: [number, number, number] }) {
    // 這裡先保留接口，實際執行請在 room.ts 增加對應控制點（僅 DEV/白名單）
    return { ok: true, note: "Admin hooks reserved. Implement in lib/sicbo/room.ts if needed." };
  }
}

export default SicboService;
