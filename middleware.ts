// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot',
  '/reset',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot',
  '/api/auth/reset',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 放行公開路由與靜態資源、_next
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') // 其他 auth API
  ) {
    return NextResponse.next();
  }

  // 其餘視為需要登入
  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 驗證 JWT
  const secret = (process.env.JWT_SECRET || '') as jwt.Secret;
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
  matcher: [
    '/', '/profile/:path*', '/wallet/:path*',
    '/casino/:path*', '/admin/:path*',
    // 其他需要保護的前端路由加在這裡
  ],
};
