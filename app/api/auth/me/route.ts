export const runtime = "nodejs";
// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWTFromRequest } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const t = await verifyJWTFromRequest(req);
  if (!t) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: t.userId },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  if (!user) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}
