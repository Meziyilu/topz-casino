// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 簡易守門：有 token 才能進保護頁
 * - 未登入想進 /lobby /bank /admin /casino/* 就導去 /login?next=...
 * - 已登入進 /login 則導回 /lobby
 * - 首頁 / 依照是否有 token 導 /lobby 或 /login
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value ?? "";

  const isAuthed = !!token;
  const isLogin = pathname === "/login";
  const isHome = pathname === "/";

  const isProtected =
    pathname.startsWith("/lobby") ||
    pathname.startsWith("/bank") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/casino");

  // 未登入 → 進保護頁，導去 login
  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // 登入後回跳
    const next = encodeURIComponent(pathname + (search || ""));
    url.search = `?next=${next}`;
    return NextResponse.redirect(url);
  }

  // 已登入 → 進 login，導回 lobby
  if (isAuthed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/lobby";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 首頁：依狀態導流
  if (isHome) {
    const url = req.nextUrl.clone();
    url.pathname = isAuthed ? "/lobby" : "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 哪些路由要經過 middleware
export const config = {
  matcher: [
    "/",          // 首頁
    "/login",     // 登入
    "/lobby",     // 大廳
    "/bank",      // 銀行
    "/admin/:path*", // 管理員
    "/casino/:path*", // 百家樂等
  ],
};
