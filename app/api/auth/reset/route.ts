// app/api/auth/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/form";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const raw = await parseFormData(req);
    const token = String(raw.token || "");
    const newPassword = String(raw.newPassword || "");

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ ok: false, msg: "參數不正確" }, { status: 400 });
    }

    const prt = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!prt || prt.usedAt) {
      return NextResponse.json({ ok: false, msg: "重設連結無效" }, { status: 400 });
    }
    if (prt.expiredAt && prt.expiredAt.getTime() < Date.now()) {
      return NextResponse.json({ ok: false, msg: "重設連結已過期" }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: prt.userId }, data: { password: hash } }),
      prisma.passwordResetToken.update({ where: { id: prt.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, msg: "密碼已更新，請重新登入" });
  } catch (e) {
    console.error("reset error", e);
    return NextResponse.json({ ok: false, msg: "伺服器錯誤" }, { status: 500 });
  }
}
