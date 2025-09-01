// route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  const userId = (auth as { userId?: string; sub?: string } | null)?.userId ?? (auth as { sub?: string } | null)?.sub;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, balance: true },
  });
  if (!me) {
    return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true, data: { balance: me.balance } },
    { headers: { "cache-control": "no-store" } }
  );
}
