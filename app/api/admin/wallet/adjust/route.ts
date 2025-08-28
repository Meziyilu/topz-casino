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

type Target = "WALLET" | "BANK";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "");
    const target = String(body?.target || "WALLET").toUpperCase() as Target;
    const delta = Number(body?.delta || 0);
    const memo = String(body?.memo || "");

    if (!userId) return noStoreJson({ error: "缺少 userId" }, 400);
    if (!["WALLET", "BANK"].includes(target)) return noStoreJson({ error: "target 僅能 WALLET/BANK" }, 400);
    if (!Number.isFinite(delta) || delta === 0) return noStoreJson({ error: "delta 必須為非 0 數字" }, 400);

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true, bankBalance: true },
      });
      if (!u) throw new Error("找不到使用者");

      let nextBalance = u.balance;
      let nextBank = u.bankBalance;

      if (target === "WALLET") nextBalance += delta;
      else nextBank += delta;

      if (nextBalance < 0 || nextBank < 0) throw new Error("調整後餘額不可小於 0");

      const after = await tx.user.update({
        where: { id: userId },
        data: {
          balance: nextBalance,
          bankBalance: nextBank,
        },
        select: { balance: true, bankBalance: true },
      });

      await tx.ledger.create({
        data: {
          userId,
          type: "ADMIN_ADJUST" as any,
          target: target as any,
          delta,
          memo: memo || `管理員(${admin.email})調整 ${target === "WALLET" ? "錢包" : "銀行"} ${delta > 0 ? "+" : ""}${delta}`,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return after;
    });

    return noStoreJson({ ok: true, balance: out.balance, bank: out.bankBalance });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
