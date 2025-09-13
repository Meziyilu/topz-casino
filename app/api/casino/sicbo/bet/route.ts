export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SicBoBetKind, SicBoRoomCode, LedgerType } from "@prisma/client";
import { getOrRotateRound, validatePayload } from "@/services/sicbo.service";
import { debitTx } from "@/services/wallet.service";

export async function POST(req: Request) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const room = body?.room as SicBoRoomCode;
    const kind = body?.kind as SicBoBetKind;
    const amount = Number(body?.amount);
    const payload = body?.payload ?? {};

    if (!room || !kind || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    // 拿當前回合 & 檢查封盤
    const state = await getOrRotateRound(room);
    if (state.locked) {
      return NextResponse.json({ error: "LOCKED" }, { status: 400 });
    }

    // 驗證 payload
    const validPayload = validatePayload(kind, payload);

    // 交易：扣款 + 建注單 + 玩家統計
    const bet = await prisma.$transaction(async (tx) => {
      // 扣錢（下注）
      await debitTx(tx, auth.id, "WALLET", amount, LedgerType.BET_PLACED, {
        sicboRoom: room,
        sicboRoundId: state.round.id,
      });

      // 建注單（⚠️ 不要放 room，SicBoBet 沒這欄位）
      const created = await tx.sicBoBet.create({
        data: {
          userId: auth.id,
          roundId: state.round.id,
          kind,
          amount,
          payload: validPayload,
        },
        select: {
          id: true,
          userId: true,
          roundId: true,
          kind: true,
          amount: true,
          payload: true,
          createdAt: true,
        },
      });

      // 玩家統計
      await tx.user.update({
        where: { id: auth.id },
        data: {
          totalBets: { increment: 1 },
          totalStaked: { increment: BigInt(amount) },
          netProfit: { decrement: BigInt(amount) },
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, bet });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "BET_FAILED" }, { status: 500 });
  }
}
