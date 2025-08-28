export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma, BetSide } from "@prisma/client";
import { asAny } from "@/lib/cast";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, balance: true },
  });
}

export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const roomCodeStr = String(body?.room || "").toUpperCase();
    const side = String(body?.side || "").toUpperCase() as BetSide;
    const amount = Number(body?.amount || 0);

    const valid: BetSide[] = ["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"];
    if (!roomCodeStr) return noStoreJson({ error: "缺少 room" }, 400);
    if (!valid.includes(side)) return noStoreJson({ error: "side 不合法" }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return noStoreJson({ error: "amount 必須為正" }, 400);

    // ⚠️ 放寬 enum 型別
    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCodeStr) },
      select: { id: true, code: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const round = await prisma.round.findFirst({
      where: { roomId: room.id, phase: asAny("BETTING") },
      orderBy: [{ roundSeq: "desc" }],
      select: { id: true, startedAt: true },
    });
    if (!round) return noStoreJson({ error: "目前沒有可下注回合" }, 400);

    // 還在下注時間內？
    const now = Date.now();
    const sec = Math.floor((now - new Date(round.startedAt).getTime()) / 1000);
    if (sec >= room.durationSeconds) return noStoreJson({ error: "下注已截止" }, 400);

    // 交易：扣款 + 建 bet + 記 ledger
    const out = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const u = await tx.user.findUnique({ where: { id: me.id }, select: { balance: true, bankBalance: true } });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: { userId: me.id, roundId: round.id, side: asAny(side), amount },
        select: { id: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("BET_PLACED"),
          target: asAny("WALLET"),
          delta: -amount,
          memo: `下注 ${side} (${room.code})`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { betId: bet.id, balance: after.balance };
    });

    return noStoreJson({ ok: true, ...out });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
