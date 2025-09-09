// app/api/casino/baccarat/admin/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { RoomCode } from "@prisma/client";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
});

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = Q.safeParse({ room: url.searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ ok:false, error:"BAD_ROOM" }, { status:400 });
    const room = parsed.data.room as RoomCode;

    // 取該房最新一局
    const cur = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
      select: { id:true, phase:true },
    });

    if (!cur) {
      return NextResponse.json({ ok:true, message:"NO_ROUND" });
    }

    // 聚合本局所有下注，準備退款
    const grouped = await prisma.bet.groupBy({
      by: ["userId"],
      where: { roundId: cur.id },
      _sum: { amount: true },
    });

    await prisma.$transaction(async (tx) => {
      // 退款（把下注總額加回去）
      for (const g of grouped) {
        const refund = g._sum.amount ?? 0;
        if (refund > 0) {
          await tx.user.update({
            where: { id: g.userId },
            data: { balance: { increment: refund } },
          });
          // 你的 LedgerType 沒有 REFUND，就用 PAYOUT 記一筆正數當退款
          await tx.ledger.create({
            data: {
              userId: g.userId,
              type: "PAYOUT",
              target: "WALLET",
              amount: refund,
            },
          });
        }
      }

      // 清掉本局的下注，避免之後再被結算
      await tx.bet.deleteMany({ where: { roundId: cur.id } });

      // 把這局標記為已結束（不寫 outcome）
      await tx.round.update({
        where: { id: cur.id },
        data: {
          phase: "SETTLED",
          endedAt: new Date(),
          outcome: null,
        },
      });
    });

    return NextResponse.json({ ok:true, roundId: cur.id, refundedUsers: grouped.length });
  } catch (e:any) {
    console.error("[admin/reset] error:", e);
    return NextResponse.json({ ok:false, error: e?.message || "SERVER_ERROR" }, { status:500 });
  }
}
