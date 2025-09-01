export const runtime = "nodejs";
// app/api/bank/withdraw/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";
import { getUserBalances, isValidAmount, readIdempotencyKey } from "@/lib/bank";

export async function POST(req: Request) {
  try {
    const token = await verifyJWTFromRequest(req);
    if (!token) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

    const body = await req.json();
    const amount = body?.amount;
    const memo = body?.memo ?? null;
    const idem = body?.idempotencyKey || readIdempotencyKey(req);

    if (!isValidAmount(amount)) {
      return NextResponse.json({ ok: false, error: "INVALID_AMOUNT" }, { status: 400 });
    }

    if (idem) {
      const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
      if (existed) {
        const u = await prisma.user.findUnique({ where: { id: existed.userId }, select: { balance: true, bankBalance: true } });
        return NextResponse.json({ ok: true, data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 }, reused: true });
      }
    }

    const userId = token.userId;

    const result = await prisma.$transaction(async (tx) => {
      const { balance, bankBalance } = await getUserBalances(tx as any, userId);
      if (bankBalance < amount) return { insufficient: true };

      const newWallet = balance + amount;
      const newBank = bankBalance - amount;

      await tx.user.update({
        where: { id: userId },
        data: { balance: newWallet, bankBalance: newBank },
      });

      await tx.ledger.create({
        data: {
          userId,
          type: "WITHDRAW",
          target: "WALLET",
          delta: +amount,
          fromTarget: "BANK",
          toTarget: "WALLET",
          amount,
          fee: 0,
          memo,
          idempotencyKey: idem,
          balanceAfter: newWallet,
          bankAfter: newBank,
          meta: { ip: req.headers.get("x-forwarded-for") || null, ua: req.headers.get("user-agent") || null },
        },
      });

      return { wallet: newWallet, bank: newBank };
    });

    if ((result as any).insufficient) {
      return NextResponse.json({ ok: false, error: "INSUFFICIENT_FUNDS" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const body = await req.json().catch(() => ({}));
      const idem = body?.idempotencyKey || readIdempotencyKey(req);
      if (idem) {
        const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
        if (existed) {
          const u = await prisma.user.findUnique({ where: { id: existed.userId }, select: { balance: true, bankBalance: true } });
          return NextResponse.json({ ok: true, data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 }, reused: true });
        }
      }
    }
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
