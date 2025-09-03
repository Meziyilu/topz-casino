import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parseFormData } from "@/lib/form";

export async function POST(req: NextRequest) {
  const body = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : await parseFormData(req);

  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset || reset.usedAt || reset.expiredAt < new Date()) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
