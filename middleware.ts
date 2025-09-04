// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PAGE_PREFIXES = ['/login', '/register', '/forgot', '/reset'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 白名單頁面直接放行
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 只要看到 token 就放行（先確保能進大廳）
  const token = req.cookies.get('token')?.value;
  if (token) return NextResponse.next();

  // 沒 token → 導回 /login?next=<原頁>
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

// 只攔前端頁面路由；API/靜態資源不攔
export const config = {
  matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'],
};
