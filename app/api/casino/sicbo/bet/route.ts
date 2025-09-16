// app/api/casino/sicbo/bet/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LedgerType, SicBoBetKind, SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound, validatePayload } from "@/services/sicbo.service";
import { debitTx } from "@/services/wallet.service";

export async function POST(req: Request) {
  try {
    // 1) 驗證登入（從 cookie）
    const auth = await getUserFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2) 解析 body
    const body = await req.json().catch(() => ({}));
    const room = body?.room as SicBoRoomCode;
    const kind = body?.kind as SicBoBetKind;
    const amount = Number(body?.amount);
    const payload = body?.payload ?? {};

    if (!room || !kind || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    // 3) 取得當前回合 & 檢查封盤
    const state = await getOrRotateRound(room);
    if (!state?.round?.id) {
      return NextResponse.json({ error: "ROUND_NOT_READY" }, { status: 400 });
    }
    if (state.locked) {
      return NextResponse.json({ error: "LOCKED" }, { status: 400 });
    }

    // 4) 驗證下注 payload
    const validPayload = validatePayload(kind, payload);

    // 5) 交易：扣款 -> 建注單 -> 更新玩家統計
    const bet = await prisma.$transaction(async (tx) => {
      // 扣錢（下注）
      await debitTx(
        tx,
        auth.id,
        "WALLET",
        amount,
        LedgerType.BET_PLACED,
        {
          // 👉 這些 key 若不在 LedgerMeta 型別中，先以 any 斷言，資料仍會寫入 meta(JSON)
          sicboRoom: room,
          sicboRoundId: state.round.id,
          sicboBetKind: kind,
          payload: validPayload,
        } as any
      );

      // 建立注單
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

      // 更新玩家統計
      await tx.user.update({
        where: { id: auth.id },
        data: {
          totalBets: { increment: 1 },
          totalStaked: { increment: BigInt(amount) },
          netProfit: { decrement: BigInt(amount) }, // 下單時先 -amount，結算時再回沖
        },
      });

      return created;
    });

    return NextResponse.json({ ok: true, bet });
  } catch (e: any) {
    console.error("SICBO_BET_POST", e);
    return NextResponse.json(
      { error: e?.message || "BET_FAILED" },
      { status: 500 }
    );
  }
}
