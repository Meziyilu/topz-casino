// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // 清除 token cookie（與發放時同網域/同 path）
  res.headers.set(
    "Set-Cookie",
    [
      `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      // 如有 Secure，Render 走 HTTPS 時可以加上；本地就不要
    ].join("")
  );
  return res;
}
