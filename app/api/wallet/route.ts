// app/api/wallet/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

type BalanceTarget = "WALLET" | "BANK";

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

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireUser(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    return prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, balance: true, bankBalance: true },
    });
  } catch {
    return null;
  }
}

// GET: 讀取餘額
export async function GET(req: Request) {
  const me = await requireUser(req);
  if (!me) return noStoreJson({ error: "未登入" }, 401);
  return noStoreJson({ balance: me.balance, bankBalance: me.bankBalance });
}

// POST: 轉帳 銀行⇄錢包
// body: { from: "BANK" | "WALLET", amount: number }
export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    if (!me) return noStoreJson({ error: "未登入" }, 401);

    const body = await req.json().catch(() => ({}));
    const from = String(body?.from || "").toUpperCase() as BalanceTarget;
    const amount = Number(body?.amount || 0);

    if (!(from === "BANK" || from === "WALLET")) {
      return noStoreJson({ error: "from 必須是 BANK 或 WALLET" }, 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return noStoreJson({ error: "amount 必須為正數" }, 400);
    }

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: me.id },
        select: { balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");

      if (from === "BANK") {
        // 銀行 → 錢包
        if (u.bankBalance < amount) throw new Error("銀行餘額不足");
        const updated = await tx.user.update({
          where: { id: me.id },
          data: {
            bankBalance: { decrement: amount },
            balance: { increment: amount },
          },
          select: { balance: true, bankBalance: true },
        });

        // 記帳（同一動作記兩筆，標示方向；LedgerType 使用 "TRANSFER"）
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER" as any,
            target: "BANK" as BalanceTarget,
            delta: -amount,
            memo: "銀行 → 錢包",
            balanceAfter: updated.balance,
            bankAfter: updated.bankBalance,
          },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER" as any,
            target: "WALLET" as BalanceTarget,
            delta: amount,
            memo: "銀行 → 錢包",
            balanceAfter: updated.balance,
            bankAfter: updated.bankBalance,
          },
        });

        return { balance: updated.balance, bankBalance: updated.bankBalance };
      } else {
        // from === "WALLET"：錢包 → 銀行
        if (u.balance < amount) throw new Error("錢包餘額不足");
        const updated = await tx.user.update({
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
            target: "WALLET" as BalanceTarget,
            delta: -amount,
            memo: "錢包 → 銀行",
            balanceAfter: updated.balance,
            bankAfter: updated.bankBalance,
          },
        });
        await tx.ledger.create({
          data: {
            userId: me.id,
            type: "TRANSFER" as any,
            target: "BANK" as BalanceTarget,
            delta: amount,
            memo: "錢包 → 銀行",
            balanceAfter: updated.balance,
            bankAfter: updated.bankBalance,
          },
        });

        return { balance: updated.balance, bankBalance: updated.bankBalance };
      }
    });

    return noStoreJson({ ok: true, ...out });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
