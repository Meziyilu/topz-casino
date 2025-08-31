// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signJWT } from "@/lib/auth";

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

    const res = NextResponse.json({ ok: true, token, userId: user.id });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
