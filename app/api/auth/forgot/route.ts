// app/api/auth/forgot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFormData } from "@/lib/form";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const raw = await parseFormData(req);
    const email = String(raw.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, msg: "請輸入 Email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // 出於安全性：即使沒有該帳號也回 200，避免暴力探測
    if (!user) {
      return NextResponse.json({ ok: true, msg: "若帳號存在，將寄送重設連結" });
    }

    const token = randomBytes(16).toString("hex"); // 32字元
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiredAt, usedAt: null },
      create: { userId: user.id, token, expiredAt },
    });

    // 這裡你之後可接第三方信件服務。現在直接回傳 URL 方便測試。
    const origin = req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host")}`
      : process.env.APP_ORIGIN || "http://localhost:3000";

    const resetUrl = `${origin}/reset?token=${token}`;

    return NextResponse.json({ ok: true, resetUrl });
  } catch (e) {
    console.error("forgot error", e);
    return NextResponse.json({ ok: false, msg: "伺服器錯誤" }, { status: 500 });
  }
}
