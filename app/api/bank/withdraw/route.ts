// app/api/bank/withdraw/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { isValidAmount, readIdempotencyKey } from "@/lib/bank";
import type { Prisma } from "@prisma/client";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  // 先驗證
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;
  if (!userId) return json({ ok: false, error: "UNAUTH" } as const, 401);

  // 只讀一次 body
  const body = (await req.json().catch(() => ({}))) as {
    amount?: unknown;
    memo?: unknown;
    idempotencyKey?: unknown;
  };
  const amount = Number(body.amount);
  const memo = typeof body.memo === "string" ? body.memo : null;
  const idem =
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null) || readIdempotencyKey(req);

  if (!isValidAmount(amount)) {
    return json({ ok: false, error: "INVALID_AMOUNT" } as const, 400);
  }

  // 冪等快取
  if (idem) {
    const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
    if (existed) {
      const u = await prisma.user.findUnique({
        where: { id: existed.userId },
        select: { balance: true, bankBalance: true },
      });
      return json(
        { ok: true, data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 }, reused: true } as const
      );
    }
  }

  try {
    // 交易：銀行扣、錢包加、寫分錄
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: String(userId) },
        select: { balance: true, bankBalance: true },
      });
      const wallet = u?.balance ?? 0;
      const bank = u?.bankBalance ?? 0;

      if (bank < amount) throw new Error("INSUFFICIENT_FUNDS");

      const newWallet = wallet + amount;
      const newBank = bank - amount;

      await tx.user.update({
        where: { id: String(userId) },
        data: { balance: newWallet, bankBalance: newBank },
      });

      await tx.ledger.create({
        data: {
          userId: String(userId),
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
          meta: {
            ip: req.headers.get("x-forwarded-for") || null,
            ua: req.headers.get("user-agent") || null,
          } as Prisma.InputJsonValue,
        },
      });

      return { wallet: newWallet, bank: newBank };
    });

    return json({ ok: true, data: result } as const);
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    const msg = e instanceof Error ? e.message : "";

    if (msg === "INSUFFICIENT_FUNDS") {
      return json({ ok: false, error: "INSUFFICIENT_FUNDS" } as const, 400);
    }

    // Prisma unique violation（冪等重試）
    if (code === "P2002" && idem) {
      const existed = await prisma.ledger.findUnique({ where: { idempotencyKey: idem } });
      if (existed) {
        const u = await prisma.user.findUnique({
          where: { id: existed.userId },
          select: { balance: true, bankBalance: true },
        });
        return json(
          { ok: true, data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 }, reused: true } as const
        );
      }
    }

    return json({ ok: false, error: "SERVER_ERROR" } as const, 500);
  }
}
