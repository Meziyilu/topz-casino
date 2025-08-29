// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signJWT } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/auth/login
 * body: { email: string, password: string }
 * 成功：Set-Cookie token=... 並回傳 { ok: true }
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({} as any));
    if (!email || !password) {
      return NextResponse.json({ error: "缺少帳號或密碼" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: { id: true, email: true, password: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    // 簽發 JWT（sub=使用者 id）
    const token = await signJWT({ sub: user.id, email: user.email, isAdmin: user.isAdmin });

    // 設定 Cookie
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
    res.headers.append(
      "Set-Cookie",
      [
        `token=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=2592000", // 30天
        "Secure",
      ].join("; ")
    );
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// 其餘方法擋掉（可選）
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
