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
  const me = await getUserFromRequest(req);
  if (!me) return noStoreJson({ error: "未登入" }, 401);

  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { balance: true, bankBalance: true },
  });
  return noStoreJson({ balance: u?.balance ?? 0, bankBalance: u?.bankBalance ?? 0 });
}

/** POST { action: "deposit"|"withdraw", amount: number } */
export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const { action, amount } = await req.json();
    const amt = parseInt(String(amount || 0), 10);
    if (!amt || amt <= 0) return noStoreJson({ error: "金額必須 > 0" }, 400);

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: me.id } });
      if (!u) throw new Error("找不到使用者");

      if (action === "deposit") {
        if (u.bankBalance < amt) throw new Error("銀行餘額不足");
        const after = await tx.user.update({
          where: { id: me.id },
          data: { bankBalance: { decrement: amt }, balance: { increment: amt } },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER",
            target: "WALLET",
            delta: amt,
            memo: "銀行 → 錢包",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      } else if (action === "withdraw") {
        if (u.balance < amt) throw new Error("錢包餘額不足");
        const after = await tx.user.update({
          where: { id: me.id },
          data: { balance: { decrement: amt }, bankBalance: { increment: amt } },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER",
            target: "BANK",
            delta: amt,
            memo: "錢包 → 銀行",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      } else {
        throw new Error("不支援的 action");
      }
    });

    return noStoreJson(out);
  } catch (e: any) {
    return noStoreJson({ error: e.message || "Server error" }, 400);
  }
}
