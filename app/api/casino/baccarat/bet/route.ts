// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma, { Prisma, $Enums } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

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
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
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
    const roomCode = String(body.roomCode || "").toUpperCase().trim();
    const sideStr = String(body.side || "").toUpperCase().trim();
    const amount = Number(body.amount || 0);

    if (!roomCode) return noStoreJson({ error: "缺少 roomCode" }, 400);

    // 轉為 Prisma Enum，避免 as-any
    const validSides: Array<$Enums.BetSide> = ["PLAYER", "BANKER", "TIE", "PLAYER_PAIR", "BANKER_PAIR"];
    if (!validSides.includes(sideStr as $Enums.BetSide)) {
      return noStoreJson({ error: "side 不合法" }, 400);
    }
    const side = sideStr as $Enums.BetSide;

    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "金額不合法" }, 400);
    }

    // 3) 找房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as unknown as $Enums.RoomCode },
      select: { id: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    // 4) 找當日最新一局（用區間而不是等於）
    const dayStartUtc = taipeiDayStart(new Date());
    const dayEndUtc = addDays(dayStartUtc, 1);

    const round = await prisma.round.findFirst({
      where: {
        roomId: room.id,
        day: { gte: dayStartUtc, lt: dayEndUtc },
      },
      orderBy: { roundSeq: "desc" },
      select: { id: true, phase: true, startedAt: true, createdAt: true },
    });
    if (!round) return noStoreJson({ error: "本日尚未開局" }, 400);

    if (round.phase !== "BETTING") {
      return noStoreJson({ error: "非下注時間" }, 400);
    }

    // 5) 餘額檢查
    if (me.balance < amount) {
      return noStoreJson({ error: "餘額不足" }, 400);
    }

    // 6) 交易：建立下注、扣錢、寫入 ledger
const created = await prisma.$transaction(async (tx) => {
  // ✅ 只寫純標量，用 UncheckedCreateInput，避免 Prisma 型別要求 room 關聯
  const bet = await tx.bet.create({
    data: {
      userId: me.id,
      roundId: round.id,
      side: side as any,     // 或 import {$Enums} 後用正確 enum 型別
      amount,
    } as import("@prisma/client").Prisma.BetUncheckedCreateInput,
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
      type: "BET_PLACED" as any,
      target: "WALLET" as any,
      delta: -amount,
      memo: `下注 ${side} -${amount}`,
      balanceAfter: after.balance,
      bankAfter: after.bankBalance,
    },
  });

  return bet;
});