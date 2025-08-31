// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signJWT } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const password = body?.password || "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "INVALID_LOGIN" }, { status: 401 });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "INVALID_LOGIN" }, { status: 401 });
    }

    const token = await signJWT({ userId: user.id });

    // 設置 HttpOnly Cookie（同時回傳 token，兩邊都支援）
    const res = NextResponse.json({ ok: true, token, userId: user.id });
    try {
      cookies().set("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7天
      });
    } catch {
      // 在邊緣/特定執行環境讀寫 cookies() 可能會限制，失敗就只靠回傳 token
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
