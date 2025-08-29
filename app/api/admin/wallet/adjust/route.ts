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

/** POST { userId: string, target: "WALLET"|"BANK", delta: number, memo?: string } */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { userId, target, delta, memo } = await req.json();

    if (!userId || (target !== "WALLET" && target !== "BANK") || typeof delta !== "number") {
      return noStoreJson({ error: "參數不完整" }, 400);
    }
    if (!delta || delta === 0) return noStoreJson({ error: "調整金額不可為 0" }, 400);

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: String(userId) } });
      if (!u) throw new Error("找不到使用者");

      if (target === "WALLET") {
        const newBal = u.balance + delta;
        if (newBal < 0) throw new Error("錢包餘額不可為負");
        const after = await tx.user.update({
          where: { id: u.id },
          data: { balance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: u.id,
            type: "ADMIN_ADJUST",
            target: "WALLET",
            delta,
            memo: memo || "管理員調整",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      } else {
        const newBank = u.bankBalance + delta;
        if (newBank < 0) throw new Error("銀行餘額不可為負");
        const after = await tx.user.update({
          where: { id: u.id },
          data: { bankBalance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: u.id,
            type: "ADMIN_ADJUST",
            target: "BANK",
            delta,
            memo: memo || "管理員調整",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      }
    });

    return noStoreJson(out);
  } catch (e: any) {
    const status = e?.status || 400;
    return noStoreJson({ error: e.message || "Server error" }, status);
  }
}
