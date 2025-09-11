export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ error: "MISSING_USER" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ balance: u.balance, bankBalance: u.bankBalance });
}
