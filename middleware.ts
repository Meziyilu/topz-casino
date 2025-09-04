// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC_PATHS = new Set([
  '/login', '/register', '/forgot', '/reset',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot', '/api/auth/reset',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 放行公開路由 & 靜態資源
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const secret = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
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
  matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'],
};
