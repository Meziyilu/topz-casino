// app/api/wallet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

// 小工具
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

// 讀取我的餘額（錢包＋銀行）
export async function GET(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);

    const u = await prisma.user.findUnique({
      where: { id: me.id },
      select: { balance: true, bankBalance: true },
    });
    if (!u) return noStoreJson({ error: "找不到使用者" }, 404);

    return noStoreJson({ balance: u.balance, bankBalance: u.bankBalance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}

/**
 * 銀行 ⇄ 錢包轉帳
 * body: { from: "BANK"|"WALLET", amount: number }
 * - BANK → WALLET：銀行扣、錢包加
 * - WALLET → BANK：錢包扣、銀行加
 * 會寫入一條 Ledger(type="TRANSFER")
 */
export async function POST(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return noStoreJson({ error: "尚未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const from = String(body?.from || "");
    const amount = Number(body?.amount || 0);

    if (!["BANK", "WALLET"].includes(from)) {
      return noStoreJson({ error: "from 必須是 BANK 或 WALLET" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "amount 必須是大於 0 的數字" }, 400);
    }

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");

      if (from === "BANK") {
        if (u.bankBalance < amount) throw new Error("銀行餘額不足");
        const after = await tx.user.update({
          where: { id: me.id },
          data: {
            bankBalance: { decrement: amount },
            balance: { increment: amount },
          },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER" as any,
            target: "WALLET" as any, // 最終流入到錢包
            delta: amount,
            memo: "銀行 → 錢包",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      } else {
        // WALLET -> BANK
        if (u.balance < amount) throw new Error("錢包餘額不足");
        const after = await tx.user.update({
          where: { id: me.id },
          data: {
            balance: { decrement: amount },
            bankBalance: { increment: amount },
          },
          select: { balance: true, bankBalance: true },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER" as any,
            target: "BANK" as any,
            delta: amount,
            memo: "錢包 → 銀行",
            balanceAfter: after.balance,
            bankAfter: after.bankBalance,
          },
        });
        return after;
      }
    });

    return noStoreJson({ ok: true, balance: out.balance, bankBalance: out.bankBalance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "轉帳失敗" }, 400);
  }
}
