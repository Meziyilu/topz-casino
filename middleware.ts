// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
// 若你要嚴格驗證：import jwt from 'jsonwebtoken';

const PUBLIC_PATHS = new Set([
  '/login', '/register', '/forgot', '/reset',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot', '/api/auth/reset'
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 靜態與公開路由直接放行
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  // 只檢查是否有 token（避免伺服端在 verify 時 500）
  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // --- 如果你要嚴格驗證，改成下面這段（確保 try/catch 不會 500）
  /*
  try {
    const secret = (process.env.JWT_SECRET || '') as jwt.Secret;
    jwt.verify(token, secret);
  } catch {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  */

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/', '/profile/:path*', '/wallet/:path*',
    '/casino/:path*', '/admin/:path*',
  ],
};
