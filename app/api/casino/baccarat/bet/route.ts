// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import type { BetSide, LedgerType, BalanceTarget, RoomCode } from "@prisma/client";

// 小工具
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
    select: { id: true, balance: true },
  });
}

// 台北日界線 00:00（以 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    const me = await getUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      roomCode?: RoomCode | string;
      side?: BetSide | string;
      amount?: number;
    };

    const roomCode = String(body.roomCode || "").toUpperCase() as RoomCode;
    const side = String(body.side || "").toUpperCase() as BetSide;
    const amount = Number(body.amount || 0);

    if (!["R30", "R60", "R90"].includes(roomCode))
      return noStoreJson({ error: "房間代碼錯誤" }, 400);
    if (!["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"].includes(side))
      return noStoreJson({ error: "下注面錯誤" }, 400);
    if (!Number.isFinite(amount) || amount <= 0)
      return noStoreJson({ error: "下注金額需為正數" }, 400);

    // 取得當日最新一局（該房）
    const dayStartUtc = taipeiDayStart(new Date());
    const round = await prisma.round.findFirst({
      where: { room: { code: asAny(roomCode) }, day: dayStartUtc },
      orderBy: { roundSeq: "desc" },
      select: { id: true, phase: true },
    });
    if (!round) return noStoreJson({ error: "目前無有效局" }, 400);
    if (round.phase !== asAny("BETTING"))
      return noStoreJson({ error: "非下注階段" }, 400);

    // 餘額檢查
    if ((me.balance ?? 0) < amount)
      return noStoreJson({ error: "餘額不足" }, 400);

    // 交易：扣款 + 建立下注 + 寫入 Ledger
    await prisma.$transaction(async (tx) => {
      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round.id,
          side: asAny(side),
          amount,
        },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: asAny<LedgerType>("BET_PLACED"),
          target: asAny<BalanceTarget>("WALLET"),
          delta: -amount, // 扣款記為負數
          memo: `下注 ${side} 金額 ${amount}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });
    });

    // 回傳：該局我的總下注（聚合）
    const my = await prisma.bet.groupBy({
      by: ["side"],
      where: { userId: me.id, roundId: round.id },
      _sum: { amount: true },
    });

    const myBets: Record<string, number> = {};
    for (const r of my) {
      myBets[r.side as any] = (r as any)._sum.amount ?? 0;
    }

    return noStoreJson({ ok: true, myBets });
  } catch (e: any) {
    console.error("BET ERROR:", e);
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
