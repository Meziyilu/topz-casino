// app/api/admin/wallet/adjust/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function readTokenFromHeaders(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function getAdmin(req: Request) {
  const token = readTokenFromHeaders(req);
  if (!token) return null;
  const payload = await verifyJWT(token).catch(() => null);
  if (!payload?.sub) return null;
  const u = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
  return u?.isAdmin ? u : null;
}

export async function POST(req: Request) {
  try {
    const me = await getAdmin(req);
    if (!me) return noStoreJson({ error: "需要管理員權限" }, 403);

    const { userId, delta, note } = await req.json();
    if (!userId || !delta) return noStoreJson({ error: "缺少參數" }, 400);

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) return noStoreJson({ error: "找不到用戶" }, 404);

    const after = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: delta } },
      select: { balance: true, bankBalance: true },
    });

    await prisma.ledger.create({
      data: {
        userId,
        type: delta >= 0 ? "ADMIN_ADD" : "ADMIN_DEDUCT",
        amount: delta,
        note: note || `管理員調整 ${delta}`,
      },
    });

    return noStoreJson({ ok: true, balance: after.balance });
  } catch (e: any) {
    return noStoreJson({ error: e.message || "Server error" }, 500);
  }
}
