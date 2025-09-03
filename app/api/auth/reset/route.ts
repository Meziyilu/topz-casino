export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resetSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";

function json(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" }});
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return json({ error: "INVALID" }, 400);
  const { token, password } = parsed.data;

  const rec = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!rec || rec.usedAt || rec.expiredAt < new Date()) return json({ error: "INVALID_OR_EXPIRED" }, 400);

  const hash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { password: hash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return json({ ok: true });
}
