// lib/auth.ts （只示意跟型別與 cookies 取得相關的部分）
import type { NextRequest } from "next/server";
// … 其他 import

export async function getUserFromRequest(req: NextRequest | Request) {
  // 兼容 NextRequest / Request 的 cookies
  let cookieHeader = "";
  // @ts-ignore - NextRequest 有 cookies.get / getAll，但為了兼容我們只讀 header
  if ("headers" in req && typeof req.headers?.get === "function") {
    cookieHeader = req.headers.get("cookie") || "";
  }

  // 如果你原本是用 next/headers 的 cookies()，請改為解析 cookieHeader
  // 例如從 cookieHeader 取出 accessToken：
  const token = parseCookie(cookieHeader)["accessToken"]; // 自行實作 parseCookie

  // …驗證 JWT，查使用者，回傳 { id, email, … } …
  // return user;
}

// 小工具：把 "a=1; b=2" 轉成 { a: "1", b: "2" }
function parseCookie(str: string): Record<string, string> {
  return str.split(";").reduce<Record<string, string>>((acc, part) => {
    const i = part.indexOf("=");
    if (i > -1) {
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      acc[k] = decodeURIComponent(v);
    }
    return acc;
  }, {});
}
