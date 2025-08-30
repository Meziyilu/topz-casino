// app/api/casino/baccarat/bet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

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

// 取得台北當日 00:00（以 UTC 儲存）
function taipeiDayStart(date = new Date()) {
  const utc = date.getTime();
  const tpe = utc + 8 * 3600_000;
  const tpeStart = Math.floor(tpe / 86_400_000) * 86_400_000;
  return new Date(tpeStart - 8 * 3600_000);
}

type Side = "PLAYER" | "BANKER" | "TIE";

/** 需與 /state 同步：下注時間 = room.durationSeconds（秒） */
const BET_WINDOW_SECONDS = (durationSeconds: number) => durationSeconds;

export async function POST(req: Request) {
  try {
    // 1) 驗身分
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "請先登入" }, 401);

    // 2) 驗輸入
    const body = await req.json().catch(() => ({}));
    const roomCode = String(body?.roomCode || "").toUpperCase();
    const side: Side = body?.side;
    const amount = Number(body?.amount);

    if (!["R30", "R60", "R90"].includes(roomCode)) {
      return noStoreJson({ error: "房間代碼錯誤" }, 400);
    }
    if (!["PLAYER", "BANKER", "TIE"].includes(String(side))) {
      return noStoreJson({ error: "下注方位錯誤" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "下注金額需為正整數" }, 400);
    }

    // 3) 取房間
    const room = await prisma.room.findFirst({
      where: { code: roomCode as any },
      select: { id: true, durationSeconds: true },
    });
    if (!room) return noStoreJson({ error: "房間不存在" }, 404);

    const dayStartUtc = taipeiDayStart(new Date());

    // 4) 取得「當日最新一局」，若沒有就自動建立一局（BETTING）
    let round = await prisma.round.findFirst({
      where: { roomId: room.id, day: dayStartUtc },
      orderBy: [{ roundSeq: "desc" }],
      select: {
        id: true,
        roundSeq: true,
        phase: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!round) {
      // 沒有任何今日局 → 自動開第一局（保持與 /state 一致）
      const now = new Date();
      round = await prisma.$transaction(async (tx) => {
        const next = await tx.round.create({
          data: {
            roomId: room.id,
            day: dayStartUtc,
            roundSeq: 1,
            phase: "BETTING" as any,
            createdAt: now,
            startedAt: now,
          },
          select: {
            id: true,
            roundSeq: true,
            phase: true,
            startedAt: true,
            createdAt: true,
          },
        });
        return next;
      });
    }

    // 5) 檢查仍在下注倒數內（避免進入 REVEALING/SETTLED）
    const startMs = new Date(round.startedAt ?? round.createdAt).getTime();
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    const betWindow = BET_WINDOW_SECONDS(room.durationSeconds);
    const stillBetting = round.phase === "BETTING" && elapsed < betWindow;

    if (!stillBetting) {
      return noStoreJson({ error: "目前非下注時間" }, 400);
    }

    // 6) 交易：檢查餘額 → 扣款 → 新增 Bet(roundId) → Ledger
    const result = await prisma.$transaction(async (tx) => {
      // 最新餘額
      const user = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!user) throw new Error("使用者不存在");
      if (user.balance < amount) {
        return { ok: false, error: "餘額不足" } as const;
      }

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: { decrement: amount } },
        select: { balance: true, bankBalance: true },
      });

      const bet = await tx.bet.create({
        data: {
          userId: me.id,
          roundId: round!.id, // ✅ 只寫 roundId，不寫 roomId（你的 Bet 沒這欄）
          side: side as any,
          amount,
        },
        select: { id: true, side: true, amount: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "BET_PLACED" as any,
          target: "WALLET" as any,
          delta: -amount,
          memo: `下注 ${side} ${amount}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { ok: true as const, betId: bet.id, balance: after.balance };
    });

    if (!result.ok) {
      return noStoreJson({ error: result.error }, 400);
    }

    return noStoreJson({
      ok: true,
      betId: result.betId,
      balance: result.balance,
      message: "下注成功",
    });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
