export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, amount } = await req.json();
    if (!userId || !Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

    const upd = await prisma.$transaction(async (tx) => {
      const r = await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } }, select: { balance: true } });
      await tx.ledger.create({ data: { userId, type: "EXTERNAL_TOPUP", target: "WALLET", amount } });
      return r;
    });

    return NextResponse.json({ ok: true, balance: upd.balance });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "TOPUP_FAILED" }, { status: 500 });
  }
}
