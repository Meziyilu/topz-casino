import { NextRequest, NextResponse } from "next/server";
import { placeBet } from "@/services/baccarat.service";
import prisma from "@/lib/prisma";
import type { BetSide, RoomCode } from "@prisma/client";

/** demo 專用：把 header 中 x-user-id 解析成真正的使用者 ID */
async function resolveUserId(req: NextRequest) {
  const raw = req.headers.get("x-user-id")?.trim();
  if (!raw) return null;
  // 若傳的是資料庫 id 就直接用；若傳 demo-user 就查 demo@example.com
  if (raw === "demo-user") {
    const u = await prisma.user.findUnique({
      where: { email: "demo@example.com" },
      select: { id: true },
    });
    return u?.id ?? null;
  }
  return raw;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { room, roundId, side, amount } = (await req.json()) as {
      room: RoomCode;
      roundId: string;
      side: BetSide;
      amount: number;
    };

    if (!room || !roundId || !side || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "BAD_PARAMS" }, { status: 400 });
    }

    // 走服務：會扣款與寫 Ledger
    const bet = await placeBet(userId, room, roundId, side, amount);

    // 回傳最新餘額（讓前端立即刷新）
    const bal = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });

    return NextResponse.json({
      ok: true,
      betId: bet.id,
      balance: bal?.balance ?? 0,
      bank: bal?.bankBalance ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "BET_FAILED" },
      { status: 400 },
    );
  }
}
