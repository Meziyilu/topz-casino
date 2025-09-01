// app/api/admin/lotto/config/route.ts
import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

// 建議用共用的小工具讀 token（或保留你現有的）
function readToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/token=([^;]+)/); // 依你的 cookie 名稱調整
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request) {
  // ⬇️ 拿掉泛型，直接斷言 payload 型別
  const p = verifyJWT(readToken(req)) as null | { isAdmin?: boolean };
  if (!p?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const value = await req.json();
  // ...其餘邏輯
  return NextResponse.json({ ok: true });
}
