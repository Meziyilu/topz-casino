/* worker/src/worker.ts */
import { prisma } from "@/lib/prisma";

/* ================== 房間與時間設定 ================== */
const ROOMS = ["R30", "R60", "R90"] as const;
type RoomCode = (typeof ROOMS)[number];

const ROOM_SECONDS: Record<RoomCode, number> = {
  R30: 30,
  R60: 60,
  R90: 90,
};

// REVEALING 停留秒數；設 0 代表立刻結算（本檔預設 0）
const REVEAL_SECONDS = 0;

// 若要讓 worker 自己跑迴圈，設 WORKER_LOOP_SEC（秒）；不設就由外部 cron 觸發
const LOOP_INTERVAL_SEC = Number(process.env.WORKER_LOOP_SEC ?? 0);

/* ================== 型別 ================== */
type Outcome = "PLAYER" | "BANKER" | "TIE";
type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR"
  | "ANY_PAIR"
  | "PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

type SimpleCard = { r: number; s: number }; // r:1..13, s:0..3

const now = () => new Date();

/* ================== 可重現 RNG + 百家樂發牌 ================== */
function rng(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const draw = (rand: () => number): SimpleCard => ({
  r: Math.floor(rand() * 13) + 1, // 1..13
  s: Math.floor(rand() * 4),      // 0..3
});
const pt = (r: number) => (r >= 10 ? 0 : r === 1 ? 1 : r); // A=1, 10/J/Q/K=0

function dealBaccarat(seed: string) {
  const rand = rng(seed);
  const P: SimpleCard[] = [draw(rand), draw(rand)];
  const B: SimpleCard[] = [draw(rand), draw(rand)];

  const p2 = (pt(P[0].r) + pt(P[1].r)) % 10;
  const b2 = (pt(B[0].r) + pt(B[1].r)) % 10;

  // Natural
  if (p2 >= 8 || b2 >= 8) {
    const outcome: Outcome = p2 === b2 ? "TIE" : p2 > b2 ? "PLAYER" : "BANKER";
    return {
      outcome, pPts: p2, bPts: b2, P, B, P3: undefined, B3: undefined,
      flags: pairFlags(P, B),
    };
  }

  // Player draw rule
  let P3: SimpleCard | undefined;
  if (p2 <= 5) P3 = draw(rand);
  const pPts = (p2 + (P3 ? pt(P3.r) : 0)) % 10;

  // Banker draw rule（完整第三張規則）
  let B3: SimpleCard | undefined;
  if (!P3) {
    if (b2 <= 5) B3 = draw(rand);
  } else {
    const p3v = pt(P3.r);
    if (b2 <= 2) B3 = draw(rand);
    else if (b2 === 3 && p3v !== 8) B3 = draw(rand);
    else if (b2 === 4 && (p3v >= 2 && p3v <= 7)) B3 = draw(rand);
    else if (b2 === 5 && (p3v >= 4 && p3v <= 7)) B3 = draw(rand);
    else if (b2 === 6 && (p3v === 6 || p3v === 7)) B3 = draw(rand);
  }
  const bPts = (b2 + (B3 ? pt(B3.r) : 0)) % 10;

  const outcome: Outcome = pPts === bPts ? "TIE" : pPts > bPts ? "PLAYER" : "BANKER";
  return {
    outcome, pPts, bPts, P, B, P3, B3,
    flags: pairFlags(P, B),
  };
}

/** 判斷對子 / 任一對 / 完美對 */
function pairFlags(P: SimpleCard[], B: SimpleCard[]) {
  const pPair = P[0] && P[1] && P[0].r === P[1].r;
  const bPair = B[0] && B[1] && B[0].r === B[1].r;
  const perfectP = pPair && P[0].s === P[1].s;
  const perfectB = bPair && B[0].s === B[1].s;
  const perfectPair = !!(perfectP || perfectB);
  const anyPair = !!(pPair || bPair);
  return { playerPair: !!pPair, bankerPair: !!bPair, anyPair, perfectPair };
}

/* ================== PostgreSQL Advisory Lock（DB 鎖） ================== */
/** 給每個房一個固定整數 key（也能改成 hash(room)） */
const ROOM_LOCK_KEY: Record<RoomCode, number> = { R30: 1001, R60: 1002, R90: 1003 };

async function acquireRoomLock(room: RoomCode): Promise<boolean> {
  const key = ROOM_LOCK_KEY[room];
  const rows = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${key}) AS locked;
  `;
  return rows?.[0]?.locked === true;
}
async function releaseRoomLock(room: RoomCode) {
  const key = ROOM_LOCK_KEY[room];
  await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${key});`);
}

/* ================== 房內主要流程 ================== */
async function ensureCurrentRound(room: RoomCode) {
  const cur = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });
  if (cur) return cur;
  return prisma.round.create({
    data: { room, phase: "BETTING", startedAt: now() },
  });
}

async function tickRoom(room: RoomCode) {
  // 先嘗試拿鎖，拿不到就跳過（避免多副本搶同一房）
  const got = await acquireRoomLock(room);
  if (!got) return;
  try {
    let current = await ensureCurrentRound(room);

    if (current.phase === "BETTING") {
      const secs = ROOM_SECONDS[room];
      const due = new Date(current.startedAt.getTime() + secs * 1000);
      if (now() < due) return; // 還在下注期
      // 切到 REVEALING
      current = await prisma.round.update({
        where: { id: current.id },
        data: { phase: "REVEALING" },
      });
    }

    if (current.phase === "REVEALING") {
      // 本版 REVEAL_SECONDS=0 ⇒ 立即結算；若 >0 可在 round 增加 revealAt 判斷是否到期
      await settleAndSpawnNext(room, current.id);
      return;
    }

    if (current.phase === "SETTLED") {
      // 保險：若沒有下一局就開一局
      const next = await prisma.round.findFirst({
        where: { room, startedAt: { gt: current.startedAt } },
        orderBy: { startedAt: "desc" },
      });
      if (!next) {
        await prisma.round.create({
          data: { room, phase: "BETTING", startedAt: now() },
        });
      }
    }
  } finally {
    await releaseRoomLock(room);
  }
}

/* ================== 結算 + 開下一局 ================== */
async function settleAndSpawnNext(room: RoomCode, roundId: string) {
  // 冪等：避免重複結算
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return;
  if (round.phase === "SETTLED") return;

  // 發牌（以 roundId 為 seed）
  const sim = dealBaccarat(round.id);
  const outcome: Outcome = sim.outcome;

  // 讀下注
  const bets = await prisma.bet.findMany({ where: { roundId } });

  // 賠率
  const payoutMap: Record<BetSide, number> = {
    PLAYER: 1,
    BANKER: 1,
    TIE: 8,
    PLAYER_PAIR: 11,
    BANKER_PAIR: 11,
    ANY_PAIR: 5,
    PERFECT_PAIR: 25,
    BANKER_SUPER_SIX: 12,
  };

  // 旗標（對子/完美對/任一對）
  const { playerPair, bankerPair, anyPair, perfectPair } = sim.flags;
  const bankerSuperSix = outcome === "BANKER" && sim.bPts === 6;

  // 聚合派彩
  const userPayout: Record<string, number> = {};
  for (const b of bets) {
    let prize = 0;

    // 基本三門
    if (b.side === "PLAYER" || b.side === "BANKER" || b.side === "TIE") {
      if (outcome === "TIE") {
        if (b.side === "TIE") prize = Math.floor(b.amount * payoutMap.TIE);
        else prize = b.amount; // 和局：閒/莊退本
      } else if (outcome === "PLAYER" && b.side === "PLAYER") {
        prize = Math.floor(b.amount * payoutMap.PLAYER);
      } else if (outcome === "BANKER" && b.side === "BANKER") {
        prize = Math.floor(b.amount * payoutMap.BANKER);
      }
    }

    // 旁注
    if (b.side === "PLAYER_PAIR" && playerPair) {
      prize += Math.floor(b.amount * payoutMap.PLAYER_PAIR);
    }
    if (b.side === "BANKER_PAIR" && bankerPair) {
      prize += Math.floor(b.amount * payoutMap.BANKER_PAIR);
    }
    if (b.side === "ANY_PAIR" && anyPair) {
      prize += Math.floor(b.amount * payoutMap.ANY_PAIR);
    }
    if (b.side === "PERFECT_PAIR" && perfectPair) {
      prize += Math.floor(b.amount * payoutMap.PERFECT_PAIR);
    }
    if (b.side === "BANKER_SUPER_SIX" && bankerSuperSix) {
      prize += Math.floor(b.amount * payoutMap.BANKER_SUPER_SIX);
    }

    if (prize > 0) {
      userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
    }
  }

  // 交易：寫入結果、派彩、Ledger
  await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: roundId },
      data: {
        phase: "SETTLED",
        outcome,
        endedAt: now(),
        // 如果你 schema 有以下欄位，建議一起寫入（供前端顯示）：
        // pointP: sim.pPts, pointB: sim.bPts,
        // cardsPlayer: sim.P3 ? [sim.P[0], sim.P[1], sim.P3] : [sim.P[0], sim.P[1]],
        // cardsBanker: sim.B3 ? [sim.B[0], sim.B[1], sim.B3] : [sim.B[0], sim.B[1]],
      },
    });

    for (const [uid, inc] of Object.entries(userPayout)) {
      await tx.user.update({
        where: { id: uid },
        data: { balance: { increment: inc } },
      });
      await tx.ledger.create({
        data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc },
      });
    }
  });

  // 直接開下一局
  await prisma.round.create({
    data: { room, phase: "BETTING", startedAt: now() },
  });
}

/* ================== Worker 入口 ================== */
export async function runTick() {
  for (const room of ROOMS) {
    try {
      await tickRoom(room);
    } catch (e) {
      console.error(`[worker] room ${room} error:`, e);
    }
  }
}

/* ================== 自我輪詢（可選） ================== */
async function loopIfEnabled() {
  if (!LOOP_INTERVAL_SEC || LOOP_INTERVAL_SEC <= 0) return;
  // 單副本常駐再開；多副本要加鎖（我們對每房已有 DB 鎖）
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runTick();
    await new Promise((r) => setTimeout(r, LOOP_INTERVAL_SEC * 1000));
  }
}

if (require.main === module) {
  loopIfEnabled()
    .then(() => {
      if (!LOOP_INTERVAL_SEC) {
        runTick().finally(() => process.exit(0));
      }
    })
    .catch((e) => {
      console.error("[worker] fatal:", e);
      process.exit(1);
    });
}
