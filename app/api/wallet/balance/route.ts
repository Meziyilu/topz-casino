import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 取得目前登入使用者的餘額
 * 回傳格式：
 * {
 *   ok: true,
 *   wallet: number,
 *   bank: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { balance: true, bankBalance: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      wallet: Number(user.balance ?? 0),
      bank: Number(user.bankBalance ?? 0),
    });
  } catch (e: any) {
    console.error("wallet/balance error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
