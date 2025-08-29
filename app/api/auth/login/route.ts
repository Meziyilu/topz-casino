export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signJWT } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "缺少帳密" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });

    const token = await signJWT({ sub: user.id });
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
    });
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
