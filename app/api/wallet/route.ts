export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

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

export async function GET(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);
    const u = await prisma.user.findUnique({
      where: { id: me.id },
      select: { balance: true, bankBalance: true },
    });
    return noStoreJson({ balance: u?.balance ?? 0, bank: u?.bankBalance ?? 0 });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const direction = String(body?.direction || "BANK_TO_WALLET").toUpperCase();
    const amount = Number(body?.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) return noStoreJson({ error: "amount 必須 > 0" }, 400);
    if (!["BANK_TO_WALLET", "WALLET_TO_BANK"].includes(direction)) return noStoreJson({ error: "direction 非法" }, 400);

    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");

      let nextBalance = u.balance;
      let nextBank = u.bankBalance;
      let from: "BANK" | "WALLET";
      let to: "BANK" | "WALLET";

      if (direction === "BANK_TO_WALLET") {
        if (u.bankBalance < amount) throw new Error("銀行餘額不足");
        nextBank -= amount;
        nextBalance += amount;
        from = "BANK";
        to = "WALLET";
      } else {
        if (u.balance < amount) throw new Error("錢包餘額不足");
        nextBalance -= amount;
        nextBank += amount;
        from = "WALLET";
        to = "BANK";
      }

      const after = await tx.user.update({
        where: { id: me.id },
        data: { balance: nextBalance, bankBalance: nextBank },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId: me.id,
          type: "TRANSFER" as any,
          target: to as any, // 轉入的目標
          delta: amount,
          memo: `${from} → ${to}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return after;
    });

    return noStoreJson({ ok: true, balance: result.balance, bank: result.bankBalance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
