export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { verifyRefreshToken, signAccessToken, cookieOptions } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

function json(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" }});
}

export async function POST() {
  const token = cookies().get("refresh_token")?.value;
  if (!token) return json({ error: "NO_REFRESH" }, 401);

  try {
    const p = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: p.sub }, select: { isBanned: true, isAdmin: true, displayName: true }});
    if (!user || user.isBanned) return json({ error: "BANNED" }, 403);

    const access = signAccessToken({ sub: p.sub, isAdmin: !!user.isAdmin, displayName: user.displayName ?? undefined });
    const r = json({ ok: true });
    r.cookies.set("token", access, cookieOptions(15 * 60));
    return r;
  } catch {
    return json({ error: "INVALID_REFRESH" }, 401);
  }
}
