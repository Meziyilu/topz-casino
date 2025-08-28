// app/api/admin/wallet/adjust/route.ts
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

// 共用：從 headers 抓 token
function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function requireAdmin(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    const me = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, isAdmin: true, name: true },
    });
    if (!me || !me.isAdmin) return null;
    return me;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return noStoreJson({ error: "需要管理員權限" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "");
    const deltaRaw = body?.delta;
    const target = (String(body?.target || "WALLET").toUpperCase() as BalanceTarget);
    const note = typeof body?.memo === "string" ? body.memo.trim() : "";

    if (!userId) return noStoreJson({ error: "缺少 userId" }, 400);
    if (target !== "WALLET" && target !== "BANK")
      return noStoreJson({ error: "target 僅支援 WALLET/BANK" }, 400);

    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta) || delta === 0)
      return noStoreJson({ error: "delta 必須為非 0 的數字（正負皆可）" }, 400);

    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true, bankBalance: true },
      });
      if (!u) throw new Error("使用者不存在");

      // 調整餘額
      let afterWallet = u.balance;
      let afterBank = u.bankBalance;

      if (target === "WALLET") {
        const upd = await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
        afterWallet = upd.balance;
        afterBank = upd.bankBalance;
      } else {
        const upd = await tx.user.update({
          where: { id: userId },
          data: { bankBalance: { increment: delta } },
          select: { balance: true, bankBalance: true },
        });
        afterWallet = upd.balance;
        afterBank = upd.bankBalance;
      }

      // 寫入帳本（不含 adminId 欄位，改寫 memo）
      await tx.ledger.create({
        data: {
          userId,
          type: "ADMIN_ADJUST",
          target,
          delta,
          memo:
            `[ADMIN ${admin.email ?? admin.id}] 調整 ${target} ${delta > 0 ? "+" : ""}${delta}` +
            (note ? ` ｜ ${note}` : ""),
          balanceAfter: afterWallet,
          bankAfter: afterBank,
        },
      });

      return { userId, balance: afterWallet, bankBalance: afterBank };
    });

    return noStoreJson({ ok: true, ...result });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, 500);
  }
}
