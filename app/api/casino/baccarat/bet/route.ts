// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

type BetSide =
  | "PLAYER"
  | "BANKER"
  | "TIE"
  | "PLAYER_PAIR"
  | "BANKER_PAIR";

type BalanceTarget = "WALLET" | "BANK";

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

async function requireUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, balance: true },
    });
    return me;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.room || "").toUpperCase(); // R30/R60/R90
    const sideStr = String(body?.side || "").toUpperCase() as BetSide;
    const amount = Number(body?.amount || 0);

    const validSides: BetSide[] = [
      "PLAYER",
      "BANKER",
      "TIE",
      "PLAYER_PAIR",
      "BANKER_PAIR",
    ];
    if (!roomCode) return noStoreJson({ error: "缺少 room" }, 400);
    if (!validSides.includes(sideStr))
      return noStoreJson({ error: "side 不合法" }, 400);
    if (!Number.isFinite(amount) || amount <= 0)
      return noStoreJson({ error: "amount 必須為正數" }, 400);

    // 找房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as any },
      select: { id: true, code: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    // 找當前下注中回合（以最大 roundSeq 且 phase=BETTING）
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, phase: "BETTING" as any },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        day: true,
        roundSeq: true,
        phase: true,
        startedAt: true,
      },
    });
    if (!round) return noStoreJson({ error: "目前無可下注回合" }, 400);

    // 交易：扣款 → 建 bet → 記帳
    const result = await prisma.$transaction(async (tx) => {
      // 檢查餘額
      const u = await tx.user.findUnique({
        where: { id: me.id },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");
      if (u.balance < amount) throw new Error("餘額不足");

      // 扣錢（錢包）
      const afterDebit = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      // 建立下注（⚠️ 不寫 roomId，若有 roomCode 欄位則一併寫入）
      const createData: any = {
        userId: me.id,
        day: round.day,
        roundSeq: round.roundSeq,
        side: sideStr,
        amount,
        createdAt: new Date(),
      };
      // 如果你的 Bet model 有 roomCode（enum 或 string），這行會生效；若沒有不會出錯
      createData.roomCode = room.code;

      const bet = await tx.bet.create({ data: createData, select: { id: true } });

      // 記帳
      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED",
          target: "WALLET" satisfies BalanceTarget,
          delta: -amount,
          memo: `下注 ${sideStr}（${room.code} #${round.roundSeq}）`,
          balanceAfter: afterDebit.balance,
          bankAfter: afterDebit.bankBalance,
        },
      });

      return {
        betId: bet.id,
        balance: afterDebit.balance,
        bankBalance: afterDebit.bankBalance,
      };
    });

    return noStoreJson({ ok: true, ...result });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
