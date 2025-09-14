import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function resolveUserId(req: NextRequest) {
  const raw = req.headers.get("x-user-id")?.trim();
  if (!raw) return null;
  if (raw === "demo-user") {
    const u = await prisma.user.findUnique({
      where: { email: "demo@example.com" },
      select: { id: true },
    });
    return u?.id ?? null;
  }
  return raw;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { amount } = (await req.json()) as { amount: number };
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) {
      return NextResponse.json({ ok: false, error: "AMOUNT_INVALID" }, { status: 400 });
    }

    const u = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!u || u.balance < amt) {
      return NextResponse.json({ ok: false, error: "WALLET_NOT_ENOUGH" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { balance: { decrement: amt } } });
      await tx.ledger.create({
        data: { userId, type: "WITHDRAW", target: "WALLET", amount: amt },
      });
    });

    const bal = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });

    return NextResponse.json({ ok: true, wallet: bal?.balance ?? 0, bank: bal?.bankBalance ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "FAILED" }, { status: 500 });
  }
}
