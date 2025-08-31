// app/api/auth/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signJWT } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "請輸入 Email 與密碼" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    // 與 lib/jwt.ts 對齊：payload 需要 userId / isAdmin
    const token = signJWT({ userId: user.id, isAdmin: user.isAdmin });

    const res = NextResponse.json({ ok: true });
    // 以 HttpOnly Cookie 存 JWT（Render/Next 適用）
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,                 // 若本地開發要測試 cookie，可視情況改 false
      maxAge: 60 * 60 * 24 * 7,     // 7 天
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "登入失敗" }, { status: 500 });
  }
}
