export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { forgotSchema } from "@/lib/validation";
import crypto from "crypto";

function json(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" }});
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) return json({ error: "INVALID" }, 400);
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true }});
  if (!user) return json({ ok: true }); // 不洩漏是否存在

  const token = crypto.randomBytes(32).toString("base64url");
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, token, expiredAt },
    update: { token, expiredAt, usedAt: null },
  });

  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const resetUrl = `${base}/reset-password?token=${token}`;
  return json({ ok: true, resetUrl });
}
