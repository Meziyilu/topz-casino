// services/baccarat.service.ts
import prisma from "@/lib/prisma";
import { Round, RoomCode, RoundOutcome } from "@prisma/client";

// ====== 房間秒數（可改成讀 GameConfig）======
export const ROOM_DURATION: Record<RoomCode, number> = {
  R30: 30,
  R60: 60,
  R90: 90,
};
// 下注結束到結算的可視時間（REVEALING）
const REVEAL_WINDOW = 8; // 秒（翻牌動畫時間）
const LOCK_BEFORE = 5;   // 封盤秒數（BETTING 最後 5 秒不可下注）

// ====== 台北時間工具 ======
function toTpe(d: Date) {
  // 台北 UTC+8：前端只需要以台北當日分局；資料仍以 UTC 存
  return new Date(d.getTime() + 8 * 3600 * 1000);
}
function tpeDayKey(d: Date) {
  const t = toTpe(d);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate(),
  ).padStart(2, "0")}`;
}
function startOfDayUTC_TPE(d: Date) {
  // 取台北當日 00:00，再轉回 UTC 時間點
  const t = toTpe(d);
  const base = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0);
  return new Date(base - 8 * 3600 * 1000);
}

// ====== RNG：用 round.id 當 seed，確保同一局一致 ======
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ====== 牌/點數規則（簡化正規百家算法）======
type Card = { r: number; s: number }; // r:1~13, s:0~3
function drawCard(rand: () => number): Card {
  const r = 1 + Math.floor(rand() * 13);
  const s = Math.floor(rand() * 4);
  return { r, s };
}
function cardPoint(r: number) {
  if (r >= 10) return 0;
  return r;
}
function sumPoints(cs: Card[]) {
  const s = cs.reduce((acc, c) => acc + cardPoint(c.r), 0);
  return s % 10;
}
function toLabel(c: Card) {
  const rank = c.r === 1 ? "A" : c.r === 11 ? "J" : c.r === 12 ? "Q" : c.r === 13 ? "K" : String(c.r);
  const suit = ["♠", "♥", "♦", "♣"][c.s]!;
  return `${rank}${suit}`;
}
function sameRank(a: Card, b: Card) {
  return a.r === b.r;
}
function sameSuit(a: Card, b: Card) {
  return a.s === b.s;
}

// 第三張牌規則（常規）
function shouldPlayerDraw(p: number) {
  return p <= 5;
}
function shouldBankerDraw(b: number, p3?: number) {
  if (p3 == null) {
    // 閒未補，莊 0~5 補
    return b <= 5;
  }
  // 閒補牌後，依表決定
  if (b <= 2) return true;
  if (b === 3) return p3 !== 8;
  if (b === 4) return p3 >= 2 && p3 <= 7;
  if (b === 5) return p3 >= 4 && p3 <= 7;
  if (b === 6) return p3 === 6 || p3 === 7;
  return false;
}

export function getPhaseForRound(round: Round, duration: number) {
  const now = new Date();
  const elapsed = (now.getTime() - round.startedAt.getTime()) / 1000;
  if (elapsed < duration - REVEAL_WINDOW) return "BETTING" as const;
  if (elapsed < duration) return "REVEALING" as const;
  return "SETTLED" as const;
}

export async function ensureCurrentRound(room: RoomCode) {
  // 以台北當日為單位，若今天沒有或上一局已結束超時，開新局
  const todayStartUTC = startOfDayUTC_TPE(new Date());
  const latest = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  const needNew =
    !latest ||
    latest.startedAt < todayStartUTC ||
    getPhaseForRound(latest, ROOM_DURATION[room]) === "SETTLED";

  if (!needNew) return latest as Round;

  // 若前一局已 SETTLED（或跨日），開新局
  const created = await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      startedAt: new Date(),
    } as any,
  });

  return created as Round;
}

function dealRoundBySeed(roundId: string) {
  const rng = mulberry32(hashStr(roundId));
  const p: Card[] = [drawCard(rng), drawCard(rng)];
  const b: Card[] = [drawCard(rng), drawCard(rng)];

  let pt = sumPoints(p);
  let bt = sumPoints(b);

  // 自然勝 8/9 不補
  const pNat = pt >= 8;
  const bNat = bt >= 8;
  if (!pNat && !bNat) {
    // 閒補
    let p3: Card | undefined;
    if (shouldPlayerDraw(pt)) {
      p3 = drawCard(rng);
      p.push(p3);
      pt = sumPoints(p);
    }
    // 莊補（依規則）
    let b3: Card | undefined;
    const p3Val = p3 ? cardPoint(p3.r) : undefined;
    if (shouldBankerDraw(bt, p3Val)) {
      b3 = drawCard(rng);
      b.push(b3);
      bt = sumPoints(b);
    }
  }

  // 結果
  let outcome: RoundOutcome = "TIE";
  if (pt > bt) outcome = "PLAYER";
  else if (bt > pt) outcome = "BANKER";

  // 對子/完美對/任一對/超級6
  const playerPair = sameRank(p[0], p[1]);
  const bankerPair = sameRank(b[0], b[1]);
  const anyPair = playerPair || bankerPair;
  const perfectPair =
    (playerPair && sameSuit(p[0], p[1])) || (bankerPair && sameSuit(b[0], b[1]));
  const superSix = outcome === "BANKER" && bt === 6;

  return {
    playerCards: p,
    bankerCards: b,
    pTotal: pt,
    bTotal: bt,
    outcome,
    flags: { playerPair, bankerPair, anyPair, perfectPair, superSix },
    labels: {
      player: p.map(toLabel),
      banker: b.map(toLabel),
    },
  };
}

async function settleIfNeeded(round: Round) {
  const phase = getPhaseForRound(round, ROOM_DURATION[round.room]);
  if (phase !== "SETTLED" || round.endedAt) return round;

  // 結算
  const dealt = dealRoundBySeed(round.id);
  const { outcome, pTotal, bTotal, flags } = dealt;

  // 拉出當局所有注單
  const bets = await prisma.bet.findMany({
    where: { roundId: round.id },
    select: { id: true, userId: true, amount: true, side: true },
  });

  // 派彩：和局退本金；其他依賠率
  // NOTE: 金流寫進 ledgers 並更新 user.balance
  await prisma.$transaction(async (tx) => {
    // 更新回合
    await tx.round.update({
      where: { id: round.id },
      data: { outcome, phase: "SETTLED", endedAt: new Date() } as any,
    });

    for (const b of bets) {
      let payout = 0;
      const amt = b.amount;

      if (b.side === "PLAYER") {
        if (outcome === "PLAYER") payout = amt * 2; // 含本金
        else if (outcome === "TIE") payout = amt;  // 退本金
      } else if (b.side === "BANKER") {
        if (outcome === "BANKER") {
          // 6點視為超級6玩法拆分；一般莊 1:1
          payout = amt + Math.floor(amt * 1); // 1:1 含本金
        } else if (outcome === "TIE") payout = amt;
      } else if (b.side === "TIE") {
        if (outcome === "TIE") payout = amt * 9; // 1:8 + 本金
      } else if (b.side === "PLAYER_PAIR") {
        if (flags.playerPair) payout = amt * 12;
      } else if (b.side === "BANKER_PAIR") {
        if (flags.bankerPair) payout = amt * 12;
      } else if (b.side === "ANY_PAIR") {
        if (flags.anyPair) payout = amt * 6;
      } else if (b.side === "PERFECT_PAIR") {
        if (flags.perfectPair) payout = amt * 26;
      } else if (b.side === "BANKER_SUPER_SIX") {
        if (flags.superSix) payout = amt * 13;
      }

      if (payout > 0) {
        await tx.ledger.create({
          data: {
            userId: b.userId,
            type: "PAYOUT",
            target: "WALLET",
            amount: payout,
            roundId: round.id,
            room: round.room,
          },
        });
        await tx.user.update({
          where: { id: b.userId },
          data: { balance: { increment: payout } },
        });
      }
    }
  });

  // 結算完直接開下一局（BETTING）
  const created = await ensureCurrentRound(round.room);
  return created;
}

// ---- 對外：State DTO ----
export async function buildStateDTO(params: { round: Round; includeMyBetsForUserId: string | null }) {
  // 若當前已逾時 -> 結算並切到新局
  const activeRound = await settleIfNeeded(params.round);

  const duration = ROOM_DURATION[activeRound.room];
  const phase = getPhaseForRound(activeRound, duration);
  const elapsed = Math.floor((Date.now() - activeRound.startedAt.getTime()) / 1000);
  const secLeft = Math.max(0, duration - elapsed);

  // 近 20 局（含今天跨回合）
  const recent = await getRecentHistoryDTO(activeRound.room, 20);

  // 當局我的下注彙總
  let myBets: Record<string, number> = {};
  if (params.includeMyBetsForUserId) {
    const list = await prisma.bet.findMany({
      where: { roundId: activeRound.id, userId: params.includeMyBetsForUserId },
      select: { side: true, amount: true },
    });
    for (const it of list) {
      myBets[it.side] = (myBets[it.side] || 0) + it.amount;
    }
  }

  // 只有在 SETTLED 才回傳完整牌面 & 點數（前端會做動畫播放）
  let cards: { player: string[]; banker: string[] } | undefined = undefined;
  let result:
    | null
    | {
        outcome: RoundOutcome;
        p: number;
        b: number;
      } = null;

  if (phase === "SETTLED") {
    const dealt = dealRoundBySeed(activeRound.id);
    cards = { player: dealt.labels.player, banker: dealt.labels.banker };
    result = { outcome: dealt.outcome, p: dealt.pTotal, b: dealt.bTotal };
  }

  // 臨時 roundSeq：用「台北當日同房間回合數」估算
  const todayStart = startOfDayUTC_TPE(new Date());
  const countToday = await prisma.round.count({
    where: { room: activeRound.room, startedAt: { gte: todayStart } },
  });

  return {
    room: { code: activeRound.room, name: `百家樂 · ${activeRound.room.replace("R", "")}秒房`, durationSeconds: duration },
    day: tpeDayKey(new Date()),
    roundId: activeRound.id,
    roundSeq: countToday,
    phase,
    secLeft,
    result,
    cards,
    myBets,
    recent,
  };
}

// ---- 對外：歷史 DTO ----
export async function getRecentHistoryDTO(room: RoomCode, limit = 10) {
  const rows = await prisma.round.findMany({
    where: { room, outcome: { not: null } },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  // 依 seed 還原點數（確保一致）
  const list = rows.map((r) => {
    const dealt = dealRoundBySeed(r.id);
    return {
      roundSeq: 0, // 可在前端以 index 顯示
      outcome: dealt.outcome,
      p: dealt.pTotal,
      b: dealt.bTotal,
    };
  });

  return list.reverse();
}
