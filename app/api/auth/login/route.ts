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
    if (!user) return NextResponse.json({ error: "用戶不存在" }, { status: 400 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "密碼錯誤" }, { status: 400 });

    const token = await signJWT({ sub: user.id });

    const res = NextResponse.json({ ok: true });
    // 在 Render/Next 上用 httpOnly cookie 存 JWT
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 天
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "登入失敗" }, { status: 500 });
  }
}
