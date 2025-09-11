export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SicBoBetKind, SicBoRoomCode } from "@prisma/client";
import { getOrRotateRound } from "@/services/sicbo.service";
import { debitTx } from "@/services/wallet.service";
import { validatePayload } from "@/lib/sicbo"; // 你的 payload 檢查工具

export async function POST(req: Request) {
  try {
    const { userId, room, kind, amount, payload } = await req.json();
    if (!userId || !room || !kind || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }
    const r = room as SicBoRoomCode;
    const k = kind as SicBoBetKind;

    // 取得當前可下注的回合
    const { round, locked } = await getOrRotateRound(r);
    if (locked || round.phase !== "BETTING") {
      return NextResponse.json({ error: "ROUND_LOCKED" }, { status: 400 });
    }
    const normalized = validatePayload(k, payload);

    // 單一 transaction：扣款 + 寫單 + 更新統計
    const result = await prisma.$transaction(async (tx) => {
      await debitTx(tx, userId, "WALLET", amount, "BET_PLACED", {
        sicboRoom: r,
        sicboRoundId: round.id,
      });

      const bet = await tx.sicBoBet.create({
        data: { userId, roundId: round.id, kind: k, amount, payload: normalized as any },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          totalBets: { increment: 1 },
          totalStaked: { increment: BigInt(amount) },
          netProfit: { decrement: BigInt(amount) },
        },
      });

      return { betId: bet.id, roundId: round.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "BET_FAILED" }, { status: 500 });
  }
}
