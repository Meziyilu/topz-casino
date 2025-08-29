// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value ?? "";
  const isAuthed = !!token;

  const isAuth = pathname === "/auth";
  const isHome = pathname === "/";
  const isProtected =
    pathname.startsWith("/lobby") ||
    pathname.startsWith("/bank") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/casino");

  // 未登入 → 進保護頁，導去 /auth
  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    const next = encodeURIComponent(pathname + (search || ""));
    url.search = `?next=${next}`;
    return NextResponse.redirect(url);
  }

  // 已登入 → 進 /auth，導回 /lobby
  if (isAuthed && isAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/lobby";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 首頁 / ：依狀態導流
  if (isHome) {
    const url = req.nextUrl.clone();
    url.pathname = isAuthed ? "/lobby" : "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/auth",
    "/lobby",
    "/bank",
    "/admin/:path*",
    "/casino/:path*",
  ],
};
