import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { room, roundId, side, amount } = await req.json();

    if (user.balance < amount) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_FUNDS" }, { status: 400 });
    }

    const bet = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      return await tx.baccaratBet.create({
        data: { userId: user.id, room, roundId, side, amount },
      });
    });

    return NextResponse.json({ ok: true, bet });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
