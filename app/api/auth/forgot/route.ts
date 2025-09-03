import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseFormData } from "@/lib/form";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : await parseFormData(req);

  const { email } = body;
  if (!email) return NextResponse.json({ ok: false, error: "MISSING_EMAIL" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: true }); // 不洩漏帳號是否存在

  const token = randomBytes(32).toString("hex");
  const expiredAt = new Date(Date.now() + 1000 * 60 * 30); // 30分鐘有效

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expiredAt, usedAt: null },
    create: { userId: user.id, token, expiredAt },
  });

  return NextResponse.json({ ok: true, resetUrl: `/reset?token=${token}` });
}
