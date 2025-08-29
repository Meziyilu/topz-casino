// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const needsAuth =
    pathname === "/lobby" ||
    pathname.startsWith("/lobby/") ||
    pathname === "/casino" ||
    pathname.startsWith("/casino/") ||
    pathname === "/bank" ||
    pathname.startsWith("/bank/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  // 首頁：依是否登入決定去向
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = token ? "/lobby" : "/auth";
    return NextResponse.redirect(url);
  }

  // 未登入 → 擋掉受保護頁，送去 /auth?next=...
  if (!token && needsAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    if (pathname !== "/auth") {
      url.searchParams.set("next", pathname + (search || ""));
    }
    return NextResponse.redirect(url);
  }

  // 已登入 → 擋掉 /auth，送去 /lobby
  if (token && pathname === "/auth") {
    const url = req.nextUrl.clone();
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 把會用到的路由都交給 middleware
  matcher: ["/", "/auth", "/lobby/:path*", "/casino/:path*", "/bank/:path*", "/admin/:path*"],
};
