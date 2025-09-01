// app/api/bank/deposit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import { isValidAmount, readIdempotencyKey } from "@/lib/bank";
import type { Prisma } from "@prisma/client";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  let amount = 0;
  let memo: string | null = null;
  let idem: string | null = null;

  try {
    // 驗證
    const auth = await verifyRequest(req);
    const userId =
      (auth as { userId?: string; sub?: string } | null)?.userId ??
      (auth as { sub?: string } | null)?.sub ??
      null;
    if (!userId) return json({ ok: false, error: "UNAUTH" } as const, 401);

    // 解析請求
    body = await req.json().catch(() => ({}));
    const b = (body || {}) as { amount?: unknown; memo?: unknown; idempotencyKey?: unknown };
    amount = Number(b.amount);
    memo = (typeof b.memo === "string" ? b.memo : null) ?? null;
    idem = (typeof b.idempotencyKey === "string" ? b.idempotencyKey : null) || readIdempotencyKey(req);

    if (!isValidAmount(amount)) {
      return json({ ok: false, error: "INVALID_AMOUNT" } as const, 400);
    }

    // 冪等處理（若已有同一鍵，回傳目前餘額）
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

    // 交易：錢包扣、銀行加、寫 ledger
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: String(userId) },
        select: { balance: true, bankBalance: true },
      });
      const wallet = u?.balance ?? 0;
      const bank = u?.bankBalance ?? 0;

      if (wallet < amount) {
        // 用 throw 傳回以中止交易
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const newWallet = wallet - amount;
      const newBank = bank + amount;

      await tx.user.update({
        where: { id: String(userId) },
        data: { balance: newWallet, bankBalance: newBank },
      });

      await tx.ledger.create({
        data: {
          userId: String(userId),
          type: "DEPOSIT",
          target: "BANK",
          delta: -amount,
          fromTarget: "WALLET",
          toTarget: "BANK",
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
    // Prisma unique key 冪等衝突
    const code = (e as { code?: string } | null)?.code;
    const message = e instanceof Error ? e.message : "";

    if (message === "INSUFFICIENT_FUNDS") {
      return json({ ok: false, error: "INSUFFICIENT_FUNDS" } as const, 400);
    }

    if (code === "P2002" && idem) {
      // 同一冪等鍵重試：回傳最新餘額
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
