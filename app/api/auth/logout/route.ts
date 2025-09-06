import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // 不讀 body，直接清除 cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 0 });
  res.cookies.set("refresh", "", { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 0 });
  return res;
}
