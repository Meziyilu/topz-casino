// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC_PAGES = new Set([
  '/login',
  '/register',
  // 其他公開頁面要加在這
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 放行 API & Next 靜態資源 & 靜態檔
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  // 2) 放行公開頁面
  if (PUBLIC_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // 3) 其餘頁面需要登入（包含 `/` 大廳）
  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

// 只匹配頁面路由（不包含 /api/*）
export const config = {
  matcher: [
    '/((?!api).*)',
  ],
};
