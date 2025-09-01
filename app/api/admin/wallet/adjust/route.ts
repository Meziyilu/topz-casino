export const runtime = "nodejs";
// app/api/admin/wallet/adjust/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { userId, amount, target = "WALLET", memo = "" } = body || {};

    if (!userId || !Number.isFinite(Number(amount))) {
      return noStoreJson({ error: "userId / amount 不正確" }, 400);
    }
    if (!["WALLET", "BANK"].includes(String(target))) {
      return noStoreJson({ error: "target 僅支援 WALLET / BANK" }, 400);
    }

    const amt = Math.trunc(Number(amount));

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: String(userId) } });
      if (!user) throw new Error("使用者不存在");

      let balanceAfter = user.balance;
      let bankAfter = user.bankBalance;

      if (target === "WALLET") balanceAfter = user.balance + amt;
      else bankAfter = user.bankBalance + amt;

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
          target: target as any, // BalanceTarget
          delta: amt,
          memo: memo ? String(memo) : null,
          balanceAfter: updated.balance,
          bankAfter: updated.bankBalance,
        },
      });

      return { updated, ledger };
    });

    return noStoreJson({ ok: true, ...result });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}
