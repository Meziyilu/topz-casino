// app/api/bank/balances/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";

export async function GET(req: Request) {
  const token = await verifyJWTFromRequest(req);
  if (!token) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { balance: true, bankBalance: true },
  });

  return NextResponse.json({
    ok: true,
    data: { wallet: u?.balance ?? 0, bank: u?.bankBalance ?? 0 },
  });
}
