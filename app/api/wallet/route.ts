export const runtime = "nodejs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  return NextResponse.json({ ok: true, data: { balance: me.balance } }, { headers: { "cache-control": "no-store" } });
}
