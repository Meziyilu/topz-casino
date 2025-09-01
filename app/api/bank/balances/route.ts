// app/api/bank/balances/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request) {
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTH" },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const u = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { balance: true, bankBalance: true },
  });

  return NextResponse.json(
    { ok: true, data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 } },
    { headers: { "cache-control": "no-store" } }
  );
}
