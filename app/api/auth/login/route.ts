import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  // signout: POST /api/auth/login?signout=1
  if (url.searchParams.get("signout")) {
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("token", "", { path: "/", maxAge: 0 });
    return res;
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "缺少 email 或 password" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });

    const token = await signJWT({ sub: user.id, email: user.email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}
