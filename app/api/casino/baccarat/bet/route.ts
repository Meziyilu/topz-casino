// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";

const asAny = <T = any>(v: unknown) => v as T;

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

async function getUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;

  return prisma.user.findUnique({
    where: { id: String(payload.sub) },
    select: { id: true, email: true, balance: true, bankBalance: true },
  });
}

export async function POST(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "需要登入" }, 401);

    const body = await req.json();
    const { roomCode, side, amount } = body as {
      roomCode: string;
      side: string;
      amount: number;
    };

    if (!["PLAYER", "BANKER", "TIE"].includes(side)) {
      return noStoreJson({ error: "無效的下注方向" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "下注金額錯誤" }, 400);
    }

    // 找到當前房間 + 當日最新局
    const room = await prisma.room.findUnique({
      where: { code: asAny(roomCode) },
      select: { id: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = (() => {
      const utc = Date.now();
      const tpe = utc + 8 * 3600_000;
      const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
      return new Date(tpeStart - 8 * 3600_000);
    })();

    const round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: { roundSeq: "desc" },
      select: { id: true, phase: true },
    });
    if (!round) return noStoreJson({ error: "目前尚未建立新局" }, 400);
    if (round.phase !== "BETTING") {
      return noStoreJson({ error: "非下注時間" }, 400);
    }

    // 交易：扣款 + 建立下注 + 紀錄帳本
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true },
      });
      if (!user || user.balance < amount) {
        throw new Error("餘額不足");
      }

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id, // ✅ 僅存 roundId
          side: asAny(side),
          amount,
        },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny("BET_PLACED"),
          target: asAny("WALLET"),
          delta: -amount,
          memo: `下注 ${side} -${amount}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { bet, balance: after.balance };
    });

    return noStoreJson({ ok: true, bet: result.bet, balance: result.balance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "下注失敗" }, 500);
  }
}
