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

/**
 * body:
 * {
 *   userId?: string,
 *   email?: string,
 *   target: "WALLET" | "BANK",
 *   delta: number,         // 正數加、負數減
 *   memo?: string
 * }
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req); // 不是管理員會直接 throw
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId ? String(body.userId) : undefined;
    const email = body?.email ? String(body.email) : undefined;
    const target = String(body?.target || "");
    const delta = Number(body?.delta || 0);
    const memo = body?.memo ? String(body.memo) : `管理員調整（${admin.email}）`;

    if (!userId && !email) return noStoreJson({ error: "請提供 userId 或 email" }, 400);
    if (!["WALLET", "BANK"].includes(target)) return noStoreJson({ error: "target 必須是 WALLET 或 BANK" }, 400);
    if (!Number.isFinite(delta) || delta === 0) return noStoreJson({ error: "delta 必須是非 0 數字" }, 400);

    const out = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: userId ? { id: userId } : { email: email! },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!user) throw new Error("找不到目標使用者");

      let after;
      if (target === "WALLET") {
        after = await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
      } else {
        after = await tx.user.update({
          where: { id: user.id },
          data: { bankBalance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
      }

      await tx.ledger.create({
        data: {
          userId: user.id,
          type: "ADMIN_ADJUST" as any,
          target: target as any,
          delta,
          memo,
          balanceAfter: after.balance,
          bankAfter: after.bankBalance,
        },
      });

      return { userId: user.id, balance: after.balance, bankBalance: after.bankBalance };
    });

    return noStoreJson({ ok: true, ...out });
  } catch (e: any) {
    const msg = e?.message || "操作失敗";
    // requireAdmin 丟出來的錯直接 403
    if (msg.includes("管理員權限")) return noStoreJson({ error: msg }, 403);
    return noStoreJson({ error: msg }, 400);
  }
}
