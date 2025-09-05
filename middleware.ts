// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC = new Set([
  '/login', '/register', '/forgot', '/reset',
  '/api/auth/login', '/api/auth/register', '/api/auth/logout',
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/styles') ||   // ✅ 樣式檔
    pathname.startsWith('/images') ||   // ✅ 圖片資源
    pathname.startsWith('/api/auth')    // ✅ 其他 auth API
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
  matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'],
};
