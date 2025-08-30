// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

const asAny = <T = any>(v: unknown) => v as T;

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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

// 台北日 00:00（用 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

export async function POST(req: Request) {
  try {
    // 1) 驗證登入
    const token = readTokenFromHeaders(req);
    const payload = token ? await verifyJWT(token).catch(() => null) : null;
    if (!payload?.sub) return noStoreJson({ error: "未登入" }, 401);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, balance: true },
    });
    if (!me) return noStoreJson({ error: "用戶不存在" }, 401);

    // 2) 解析 body
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body.roomCode || "").toUpperCase();
    const side = String(body.side || "");
    const amount = Number(body.amount || 0);

    if (!roomCode) return noStoreJson({ error: "缺少 roomCode" }, 400);
    if (!["PLAYER", "BANKER", "TIE"].includes(side))
      return noStoreJson({ error: "side 不合法" }, 400);
    if (!Number.isFinite(amount) || amount <= 0)
      return noStoreJson({ error: "金額不合法" }, 400);

    // 3) 找房間與當日最新一局
    const room = await prisma.room.findFirst({
      where: { code: asAny(roomCode) },
      select: { id: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: { roundSeq: "desc" },
      select: { id: true, phase: true, startedAt: true, createdAt: true },
    });
    if (!round) return noStoreJson({ error: "本日尚未開局" }, 400);

    if (round.phase !== asAny("BETTING"))
      return noStoreJson({ error: "非下注時間" }, 400);

    // 4) 餘額檢查
    if (me.balance < amount)
      return noStoreJson({ error: "餘額不足" }, 400);

    // 5) 下單 + 餘額扣款 + 建 ledger（交易內）
    const created = await prisma.$transaction(async (tx) => {
      // ✅ Prisma 6.15：使用關聯 connect，且包含必填的 room
      const bet = await tx.bet.create({
        data: {
          amount,
          side: asAny(side),
          user:  { connect: { id: me.id } },
          round: { connect: { id: round.id } },
          room:  { connect: { id: room.id } }, // ← 必填關聯（你的 BetCreateInput 要求）
        },
        select: { id: true },
      });

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
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

      return bet;
    });

    return noStoreJson({ ok: true, betId: created.id });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
