export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SicBoRoomCode, SicBoBetKind, SicBoPhase } from "@prisma/client";
import { getOrRotateRound } from "@/services/sicbo.service";
// 若要用 cookie 身分：
// import { getUserOrThrow } from "@/lib/auth";

/** 與前端一致的總和賠率 */
const TOTAL_PAYOUT: Record<number, number> = {
  4: 50, 17: 50,
  5: 18, 16: 18,
  6: 14, 15: 14,
  7: 12, 14: 12,
  8: 8,  13: 8,
  9: 6,  12: 6,
  10: 6, 11: 6,
};

function isTriple(d: number[]) {
  return d?.length === 3 && d[0] === d[1] && d[1] === d[2];
}
function sum3(d: number[]) {
  return (d?.[0] || 0) + (d?.[1] || 0) + (d?.[2] || 0);
}

/** 預結算：回傳狀態與「含本金總返還」 */
function settlePreview(kind: SicBoBetKind, amount: number, payload: any, dice: number[] | null) {
  if (!dice || dice.length !== 3) {
    return { status: "PENDING" as const, returnAmount: 0 };
  }
  const s = sum3(dice);
  const triple = isTriple(dice);
  const counts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0,6:0};
  dice.forEach(n => (counts[n] = (counts[n] || 0) + 1));
  const has = (n: number) => (counts[n] || 0) > 0;

  let win = false;
  let odds = 0;

  switch (kind) {
    case "BIG":
      win = !triple && s >= 11 && s <= 17; odds = 1; break;
    case "SMALL":
      win = !triple && s >= 4 && s <= 10; odds = 1; break;
    case "ODD":
      win = !triple && s % 2 === 1; odds = 1; break;
    case "EVEN":
      win = !triple && s % 2 === 0; odds = 1; break;
    case "ANY_TRIPLE":
      win = triple; odds = 30; break;
    case "SPECIFIC_TRIPLE":
      win = triple && payload?.eye && counts[payload.eye] === 3; odds = 150; break;
    case "SPECIFIC_DOUBLE":
      win = payload?.eye && (counts[payload.eye] || 0) >= 2; odds = 8; break;
    case "TOTAL": {
      const t = payload?.total;
      if (typeof t === "number" && TOTAL_PAYOUT[t]) {
        win = s === t; odds = TOTAL_PAYOUT[t];
      }
      break;
    }
    case "COMBINATION": {
      const a = payload?.a, b = payload?.b;
      win = typeof a === "number" && typeof b === "number" && a !== b && has(a) && has(b);
      odds = 5;
      break;
    }
    case "SINGLE_DIE": {
      const eye = payload?.eye;
      const c = counts[eye] || 0;
      if (eye && c > 0) {
        win = true;
        odds = c; // 1/2/3 對應 1/2/3
      }
      break;
    }
    default:
      win = false; odds = 0;
  }

  if (!win) return { status: "LOSE" as const, returnAmount: 0 };
  return { status: "WIN" as const, returnAmount: amount + amount * odds };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") as SicBoRoomCode) ?? "SB_R30";
    const roundIdParam = searchParams.get("roundId");
    const userId = searchParams.get("userId"); // ⚠️ 目前依你的需求，無驗證：從 query 帶
    // 若要用 cookie 身分：
    // const me = await getUserOrThrow(req);
    // const userId = me.id;

    const full = searchParams.get("full") === "1";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10), 1), 100);

    // 取得 round（指定 roundId 或當前輪轉）
    const round = roundIdParam
      ? await prisma.sicBoRound.findUnique({ where: { id: roundIdParam } })
      : (await getOrRotateRound(room)).round;

    if (!round || !userId) {
      // 與你原本行為一致
      if (!full) return NextResponse.json({ roundId: round?.id ?? null, items: [] });
      return NextResponse.json({
        room,
        current: { roundId: round?.id ?? null, total: 0, byKind: {}, items: [] },
        recent: [],
      });
    }

    // === 簡版（預設）：只回該 round 下注 ===
    if (!full) {
      const itemsRaw = await prisma.sicBoBet.findMany({
        where: { userId, roundId: round.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, kind: true, amount: true, payload: true, createdAt: true },
      });

      // 附上預結算（含本金返還）、以及該 round 的骰子
      const items = itemsRaw.map((b) => {
        const { status, returnAmount } = settlePreview(
          b.kind as SicBoBetKind,
          b.amount,
          b.payload,
          round.dice as number[] | null
        );
        return {
          ...b,
          dice: (round.dice as number[]) || [],
          status,                // "WIN" | "LOSE" | "PENDING"
          returnAmount,          // 中獎時含本金總返還
        };
      });

      return NextResponse.json({ roundId: round.id, items });
    }

    // === 進階版（full=1）：本局彙總 + 最近注單（含歷史） ===
    // 找該房最新 round（分辨「本局」）
    const latest = await prisma.sicBoRound.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
      select: { id: true, phase: true, dice: true },
    });

    // 最近注單（帶 round 資訊，便於預結算）
    const bets = await prisma.sicBoBet.findMany({
      where: { userId, round: { room } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true, roundId: true, kind: true, amount: true, payload: true, createdAt: true,
        round: { select: { id: true, phase: true, dice: true, endedAt: true, startedAt: true } },
      },
    });

    // 本局彙總
    const currentRoundId = latest?.id || null;
    const currentBets = bets.filter(b => b.roundId === currentRoundId).reverse();
    const currentSummary = currentBets.reduce((acc: any, b) => {
      const k = b.kind as SicBoBetKind;
      if (!acc[k]) acc[k] = 0;
      acc[k] += b.amount;
      acc.__total += b.amount;
      return acc;
    }, { __total: 0 });

    // 最近注單 + 預結算
    const recent = bets.map(b => {
      const { status, returnAmount } = settlePreview(
        b.kind as SicBoBetKind,
        b.amount,
        b.payload,
        (b.round?.dice as number[]) || null
      );
      return {
        id: b.id,
        roundId: b.roundId,
        roundShort: b.roundId.slice(-6),
        kind: b.kind,
        amount: b.amount,
        payload: b.payload,
        createdAt: b.createdAt,
        roundPhase: (b.round?.phase as SicBoPhase) || null,
        dice: (b.round?.dice as number[]) || [],
        status,          // "WIN" | "LOSE" | "PENDING"
        returnAmount,    // 中獎時含本金總返還
      };
    });

    return NextResponse.json({
      room,
      current: {
        roundId: currentRoundId,
        total: currentSummary.__total || 0,
        byKind: Object.fromEntries(Object.entries(currentSummary).filter(([k]) => k !== "__total")),
        items: currentBets.map(b => ({
          id: b.id, kind: b.kind, amount: b.amount, payload: b.payload, createdAt: b.createdAt
        })),
      },
      recent,
    });
  } catch (e: any) {
    console.error("[SICBO][MY_BETS_GET]", e);
    return NextResponse.json({ error: e?.message || "MY_BETS_FAILED" }, { status: 500 });
  }
}
