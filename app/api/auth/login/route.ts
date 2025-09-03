export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken, cookieOptions } from "@/lib/jwt";

function json(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" }});
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "ip";
  if (!rateLimit(`login:${ip}`, 10, 10 * 60 * 1000)) return json({ error: "RATE_LIMITED" }, 429);

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return json({ error: "INVALID", details: parsed.error.flatten() }, 400);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true, isBanned: true, isAdmin: true, displayName: true, emailVerifiedAt: true }
  });
  if (!user) return json({ error: "INVALID_CREDENTIALS" }, 401);
  if (user.isBanned) return json({ error: "BANNED" }, 403);
  if (!user.emailVerifiedAt) return json({ error: "EMAIL_NOT_VERIFIED" }, 403);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return json({ error: "INVALID_CREDENTIALS" }, 401);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: (ip.split(",")[0] || "").trim() } });

  const access = signAccessToken({ sub: user.id, isAdmin: user.isAdmin, displayName: user.displayName || undefined });
  const refresh = signRefreshToken({ sub: user.id, isAdmin: user.isAdmin, displayName: user.displayName || undefined });

  const res = json({ ok: true });
  res.cookies.set("token", access, cookieOptions(15 * 60));
  res.cookies.set("refresh_token", refresh, cookieOptions(7 * 24 * 60 * 60));
  return res;
}
