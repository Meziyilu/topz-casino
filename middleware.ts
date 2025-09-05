// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC = new Set([
  '/login',
  '/register',
  '/forgot',
  '/reset',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  // 其他純公開 API 也可加這邊
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 放行公開路由 & 靜態資源
  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/styles')
  ) {
    return NextResponse.next();
  }

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

export const config = {
  // 只保護真正需要登入的頁面（你的大廳在 /）
  matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'],
};
