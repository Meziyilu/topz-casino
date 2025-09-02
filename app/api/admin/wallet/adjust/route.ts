// app/api/admin/wallet/adjust/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

type Target = "WALLET" | "BANK";

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return gate.res;

    const body = (await req.json().catch(() => ({}))) as {
      userId?: unknown;
      amount?: unknown;
      target?: unknown;
      memo?: unknown;
    };

    const userId = typeof body.userId === "string" ? body.userId : "";
    const rawAmount = Number(body.amount);
    const target: Target =
      (typeof body.target === "string" && (body.target === "WALLET" || body.target === "BANK")
        ? body.target
        : "WALLET");
    const memo = typeof body.memo === "string" ? body.memo : "";

    if (!userId || !Number.isFinite(rawAmount)) {
      return noStoreJson({ error: "userId / amount 不正確" } as const, 400);
    }

    const amt = Math.trunc(rawAmount);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!user) throw new Error("使用者不存在");

      const balanceAfter = target === "WALLET" ? user.balance + amt : user.balance;
      const bankAfter = target === "BANK" ? user.bankBalance + amt : user.bankBalance;

      if (balanceAfter < 0 || bankAfter < 0) {
        throw new Error("金額不可為負");
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data:
          target === "WALLET"
            ? { balance: { increment: amt } }
            : { bankBalance: { increment: amt } },
        select: { balance: true, bankBalance: true },
      });

      const ledger = await tx.ledger.create({
        data: {
          userId: user.id,
          type: "ADMIN_ADJUST",
          target: target as Prisma.$Enums.BalanceTarget,
          delta: amt,
          memo: memo || null,
          balanceAfter: updated.balance,
          bankAfter: updated.bankBalance,
        },
      });

      return { updated, ledger };
    });

    return noStoreJson({ ok: true, ...result } as const);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: msg } as const, 500);
  }
}
