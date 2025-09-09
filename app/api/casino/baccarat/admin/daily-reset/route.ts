// app/api/casino/baccarat/admin/daily-reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

function assertCronAuth(req: NextRequest) {
  const key = req.headers.get("x-cron-key");
  const ok = key && process.env.CRON_SECRET && key === process.env.CRON_SECRET;
  if (!ok) throw new Error("UNAUTHORIZED_CRON");
}

export async function POST(req: NextRequest) {
  try {
    assertCronAuth(req);

    // 歸檔/重置動作視你的 schema 而定。
    // 這裡我們做兩件事：
    // 1) 把所有非結算局強制結算為 TIE 並退注（避免殘局）。
    // 2) 為每個房開一局新的 BETTING。

    const rooms = ["R30", "R60", "R90"] as RoomCode[];
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1) 强制結束尚未 SETTLED 的局
      const openRounds = await tx.round.findMany({
        where: { phase: { not: "SETTLED" } },
        select: { id: true },
      });

      for (const r of openRounds) {
        // 把該回合所有主注退回（視規則你也可直接判 TIE 並只退主注）
        const bets = await tx.bet.findMany({ where: { roundId: r.id } });
        const refundByUser: Record<string, number> = {};
        for (const b of bets) {
          refundByUser[b.userId] = (refundByUser[b.userId] ?? 0) + b.amount;
        }
        for (const [uid, inc] of Object.entries(refundByUser)) {
          if (inc > 0) {
            await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
            await tx.ledger.create({
              data: { userId: uid, type: "REFUND", target: "WALLET", amount: inc },
            });
          }
        }
        await tx.round.update({ where: { id: r.id }, data: { phase: "SETTLED", outcome: "TIE", endedAt: now } });
      }

      // 2) 每個房間給當天第一局
      for (const room of rooms) {
        await tx.round.create({ data: { room, phase: "BETTING", startedAt: now } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    const code = msg === "UNAUTHORIZED_CRON" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
