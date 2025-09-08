import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { RoomCode, RoundPhase, BetSide } from "@prisma/client";
import { getRoomInfo, getCurrentRound, settleRound } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";

/** ========= 可調參數（避免字面量型別） ========= */
const REVEAL_SECONDS: number = Number(process.env.BACCARAT_REVEAL_SECONDS ?? 2);  // 開牌展示秒數（0 = 立即結算）
const GRACE_SECONDS: number  = Number(process.env.BACCARAT_GRACE_SECONDS  ?? 1);  // 安全緩衝（避免抖動）
const ADMIN_TOKEN: string | undefined = process.env.ADMIN_TOKEN;                  // 管理金鑰（可選）

/** ========= 驗證 ========= */
const Q = z.object({
  room: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(z.enum(["R30", "R60", "R90"] as const)),
});

/** ========= 小工具 ========= */
function sec(ms: number) {
  return ms * 1000;
}
const now = () => new Date();

function hasAdminAuth(req: NextRequest) {
  if (!ADMIN_TOKEN) return true; // 未設定金鑰 → 不檢查
  const token = req.headers.get("x-admin-token") || new URL(req.url).searchParams.get("token");
  return token === ADMIN_TOKEN;
}

/** 隨機結果（示範用；實務請依真實發牌/算點） */
type Outcome = "PLAYER" | "BANKER" | "TIE";
function randomOutcome(): { outcome: Outcome; p: number; b: number } {
  // 假裝九成不和局，1 成和局
  const r = Math.random();
  if (r < 0.1) {
    const v = Math.floor(Math.random() * 10);
    return { outcome: "TIE", p: v, b: v };
  }
  // PLAYER / BANKER 隨機、點數 0–9
  const p = Math.floor(Math.random() * 10);
  const b = Math.floor(Math.random() * 10);
  if (p === b) {
    // 避免撞到和局
    return p > 0 ? { outcome: "PLAYER", p, b: Math.max(0, (p - 1)) } : { outcome: "BANKER", p: 1, b: 0 };
  }
  return p > b ? { outcome: "PLAYER", p, b } : { outcome: "BANKER", p, b };
}

/** 判斷是否超時（用 round.startedAt 當該階段開始時間） */
function isExpired(phase: RoundPhase, startedAt: Date, limitSec: number) {
  const elapsed = Date.now() - startedAt.getTime();
  return elapsed >= sec(limitSec + GRACE_SECONDS);
}

/** 建新局（BETTING） */
async function startNewRound(room: RoomCode, secondsPerRound: number) {
  const r = await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      startedAt: now(),
      outcome: null,
    },
    select: { id: true, phase: true, startedAt: true },
  });
  return {
    action: "START_ROUND",
    roundId: r.id,
    phase: r.phase,
    startedAt: r.startedAt,
    secondsPerRound,
  };
}

/** 進入 REVEALING（或直接結算） */
async function moveToRevealingOrSettle(roundId: string) {
  if (REVEAL_SECONDS === 0) {
    // 直接結算（示範）
    const { outcome, p, b } = randomOutcome();

    // 超六：若莊家 6 點可給 12 倍
    const payoutMap: Record<BetSide, number> = {
      PLAYER: 1,
      BANKER: 1,
      TIE: 8,
      PLAYER_PAIR: 0,
      BANKER_PAIR: 0,
      ANY_PAIR: 0,
      PERFECT_PAIR: 0,
      BANKER_SUPER_SIX: outcome === "BANKER" && b === 6 ? 12 : 0,
    };

    // 設為結算（把點數存進 outcome 以外的欄位若你有；若沒有，就只存 outcome）
    await prisma.round.update({
      where: { id: roundId },
      data: { phase: "SETTLED", outcome },
    });

    await settleRound(roundId, outcome, payoutMap);

    return { action: "SETTLE", roundId, outcome, p, b };
  }

  // 先切到 REVEALING，並將 startedAt 設為現在（方便用 startedAt 當 REVEALING 計時點）
  const r = await prisma.round.update({
    where: { id: roundId },
    data: { phase: "REVEALING", startedAt: now() },
    select: { id: true, phase: true, startedAt: true },
  });

  return { action: "TO_REVEALING", roundId: r.id, phase: r.phase, revealSeconds: REVEAL_SECONDS };
}

/** 對 REVEALING 做結算 */
async function settleRevealing(roundId: string) {
  const { outcome, p, b } = randomOutcome();

  const payoutMap: Record<BetSide, number> = {
    PLAYER: 1,
    BANKER: 1,
    TIE: 8,
    PLAYER_PAIR: 0,
    BANKER_PAIR: 0,
    ANY_PAIR: 0,
    PERFECT_PAIR: 0,
    BANKER_SUPER_SIX: outcome === "BANKER" && b === 6 ? 12 : 0,
  };

  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "SETTLED", outcome },
  });

  await settleRound(roundId, outcome, payoutMap);

  return { action: "SETTLE", roundId, outcome, p, b };
}

/** ========= 主流程（GET/POST 皆可觸發） ========= */
async function handleAuto(req: NextRequest) {
  if (!hasAdminAuth(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });
  }
  const room = parsed.data.room as RoomCode;

  // 房間秒數
  const roomInfo = await getRoomInfo(room);
  const secondsPerRound = Number(roomInfo.secondsPerRound ?? 60);

  // 取得目前最新一局
  const cur = await getCurrentRound(room);

  // 無任何一局 → 開新局
  if (!cur) {
    const created = await startNewRound(room, secondsPerRound);
    return NextResponse.json({ ok: true, step: created });
  }

  // 有局：依階段處理
  if (cur.phase === "BETTING") {
    // 倒數是否超時
    if (isExpired(cur.phase, cur.startedAt, secondsPerRound)) {
      const step = await moveToRevealingOrSettle(cur.id);
      return NextResponse.json({ ok: true, step });
    }
    // 尚未超時 → 不動
    return NextResponse.json({
      ok: true,
      step: "BETTING_WAIT",
      roundId: cur.id,
      secLeft: Math.max(0, Math.ceil((cur.startedAt.getTime() + sec(secondsPerRound) - Date.now()) / 1000)),
    });
  }

  if (cur.phase === "REVEALING") {
    // REVEALING 是否超時
    if (isExpired(cur.phase, cur.startedAt, REVEAL_SECONDS)) {
      const step = await settleRevealing(cur.id);
      return NextResponse.json({ ok: true, step });
    }
    return NextResponse.json({
      ok: true,
      step: "REVEALING_WAIT",
      roundId: cur.id,
      secLeft: Math.max(0, Math.ceil((cur.startedAt.getTime() + sec(REVEAL_SECONDS) - Date.now()) / 1000)),
    });
  }

  // 已結算 → 直接開下一局
  if (cur.phase === "SETTLED") {
    const created = await startNewRound(room, secondsPerRound);
    return NextResponse.json({ ok: true, step: created });
  }

  // 不預期狀態（保底）
  return NextResponse.json({ ok: true, step: "NOOP", roundId: cur.id, phase: cur.phase });
}

export async function GET(req: NextRequest) {
  try {
    return await handleAuto(req);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleAuto(req);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
