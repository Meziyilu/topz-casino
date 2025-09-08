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

// REVEALING 停留秒數；0 = 下注期結束就立刻結算並開新局
const REVEAL_SECONDS = 0;

// 若要讓 worker 自己跑迴圈，設 WORKER_LOOP_SEC（秒）；不設就由外部 cron 觸發
const LOOP_INTERVAL_SEC = Number(process.env.WORKER_LOOP_SEC ?? 0);

// 建議在 Render 環境變數加上：TZ=Asia/Taipei
const TAIPEI_OFFSET_MIN = 8 * 60;

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

/* ================== 台北時間工具 ================== */
function toTaipeiDate(d: Date) {
  // 以 UTC 偏移方式計算 yyyy-mm-dd
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + TAIPEI_OFFSET_MIN * 60000);
}

function ymdTaipei(d = new Date()) {
  const t = toTaipeiDate(d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfTodayTaipei(d = new Date()) {
  const t = toTaipeiDate(d);
  t.setHours(0, 0, 0, 0);
  // 轉回系統時區的絕對時間
  const utc = t.getTime() - t.getTimezoneOffset() * 60000;
  return new Date(utc);
}

function startOfTomorrowTaipei(d = new Date()) {
  const s = startOfTodayTaipei(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}

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
  r: Math.floor(rand() * 13) + 1,
  s: Math.floor(rand() * 4),
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

/** 對子 / 任一對 / 完美對 */
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
      // REVEAL_SECONDS=0 ⇒ 立即結算
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

/* ================== 每日 00:00（台北）自動重置 ================== */
/**
 * 規則：
 * - 若「今天（台北時間）這個房」尚未有任何 round.startedAt，代表剛跨日：
 *   1) 取上一局（可能仍在 BETTING/REVEALING），直接正常結算（不取消、不退注）；
 *   2) 開出新的一天第一局（BETTING），startedAt=now()；
 * - 具體行為在房鎖內做，確保單房單執行緒。
 */
async function dailyResetIfNeeded(room: RoomCode) {
  const got = await acquireRoomLock(room);
  if (!got) return;
  try {
    const startToday = startOfTodayTaipei();
    const startTomorrow = startOfTomorrowTaipei();

    // 今天是否已有局
    const todayHasRound = await prisma.round.findFirst({
      where: { room, startedAt: { gte: startToday, lt: startTomorrow } },
      select: { id: true },
    });

    if (todayHasRound) return; // 已有，不需重置

    // 沒有 ⇒ 剛跨日。把最後一局補結算（若未結算），然後開新局
    const last = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
    });

    if (last && last.phase !== "SETTLED") {
      await settleRoundById(room, last.id); // 只結算，不自動開局（避免兩次開局）
    }

    // 開新的一天第一局
    await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: now() },
    });
  } finally {
    await releaseRoomLock(room);
  }
}

/* ================== 結算工具 ================== */
async function settleRoundById(room: RoomCode, roundId: string) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) return;
  if (round.phase === "SETTLED") return;

  const sim = dealBaccarat(round.id);
  const outcome: Outcome = sim.outcome;

  const bets = await prisma.bet.findMany({ where: { roundId } });

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

  const { playerPair, bankerPair, anyPair, perfectPair } = sim.flags;
  const bankerSuperSix = outcome === "BANKER" && sim.bPts === 6;

  const userPayout: Record<string, number> = {};
  for (const b of bets) {
    let prize = 0;

    // 三門：和局退本
    if (b.side === "PLAYER" || b.side === "BANKER" || b.side === "TIE") {
      if (outcome === "TIE") {
        if (b.side === "TIE") prize = Math.floor(b.amount * payoutMap.TIE);
        else prize = b.amount; // 退本
      } else if (outcome === "PLAYER" && b.side === "PLAYER") {
        prize = Math.floor(b.amount * payoutMap.PLAYER);
      } else if (outcome === "BANKER" && b.side === "BANKER") {
        prize = Math.floor(b.amount * payoutMap.BANKER);
      }
    }

    // 旁注
    if (b.side === "PLAYER_PAIR" && playerPair) prize += Math.floor(b.amount * payoutMap.PLAYER_PAIR);
    if (b.side === "BANKER_PAIR" && bankerPair) prize += Math.floor(b.amount * payoutMap.BANKER_PAIR);
    if (b.side === "ANY_PAIR" && anyPair) prize += Math.floor(b.amount * payoutMap.ANY_PAIR);
    if (b.side === "PERFECT_PAIR" && perfectPair) prize += Math.floor(b.amount * payoutMap.PERFECT_PAIR);
    if (b.side === "BANKER_SUPER_SIX" && bankerSuperSix) prize += Math.floor(b.amount * payoutMap.BANKER_SUPER_SIX);

    if (prize > 0) userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
  }

  await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: roundId },
      data: {
        phase: "SETTLED",
        outcome,
        endedAt: now(),
        // （若你的 schema 有 pointP/pointB 或 cards 欄位，可在此一起寫入）
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
}

async function settleAndSpawnNext(room: RoomCode, roundId: string) {
  await settleRoundById(room, roundId);
  // 再開下一局
  await prisma.round.create({
    data: { room, phase: "BETTING", startedAt: now() },
  });
}

/* ================== Worker 入口 ================== */
export async function runTick() {
  // 先做每日重置：每房檢查「今天」是否已開局；沒有則補結算上一局並開第一局
  for (const room of ROOMS) {
    try {
      await dailyResetIfNeeded(room);
    } catch (e) {
      console.error(`[worker] daily reset room ${room} error:`, e);
    }
  }

  // 再跑房內狀態機
  for (const room of ROOMS) {
    try {
      await tickRoom(room);
    } catch (e) {
      console.error(`[worker] tick room ${room} error:`, e);
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
