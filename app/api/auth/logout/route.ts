// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // 清掉常用三種 cookie 名
  ["token", "jwt", "access_token"].forEach((k) => {
    res.cookies.set(k, "", { path: "/", maxAge: 0 });
  });
  return res;
}
