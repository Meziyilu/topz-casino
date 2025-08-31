export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,   // localhost 測試時可設為 false
    maxAge: 0,      // 立即過期
  });
  return res;
}
