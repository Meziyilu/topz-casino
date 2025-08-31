// app/api/auth/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,    // ⚠️ 如果本地開發用 http://localhost 測試，建議改成 false
    maxAge: 0,       // 立即過期
  });
  return res;
}
