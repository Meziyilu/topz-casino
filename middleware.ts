// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC = new Set([
  '/login', '/register', '/forgot', '/reset',
  // auth APIs 全放行
  '/api/auth/login', '/api/auth/register', '/api/auth/logout',
  '/api/auth/forgot', '/api/auth/reset',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 放行公開頁面 & 靜態
  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/styles') // 你的 CSS
  ) {
    return NextResponse.next();
  }

  // 只保護前端頁面；不要攔 API（除非你想）
  if (pathname.startsWith('/api')) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 與 login API 使用相同預設密鑰（開發用）
  const secret = (process.env.JWT_SECRET || 'topz_dev_secret_please_change') as jwt.Secret;

  try {
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  // A 方案：大廳在 /lobby；把需要保護的前端頁面列進來
  matcher: ['/lobby', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'],
};
