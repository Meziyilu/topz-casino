import { NextRequest, NextResponse } from "next/server";

// 只白名單公開頁；其餘要看到 token 才放行
const PUBLIC_PREFIXES = ["/login","/register","/forgot","/reset","/api/_debug"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 不攔 _next / 靜態 / API
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  if (token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/","/profile/:path*","/wallet/:path*","/casino/:path*","/admin/:path*"],
};
