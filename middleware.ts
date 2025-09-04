// middleware.ts (暫時寬鬆版，用完再鎖回)
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PUBLIC = new Set(['/login','/register','/api/auth/login','/api/auth/register','/api/auth/logout','/api/debug/auth']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC.has(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  if (pathname !== '/') return NextResponse.next(); // 先只保護首頁

  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.next(); // 先放行觀察

  try {
    const secret = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
    jwt.verify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.next(); // 先放行觀察
  }
}

export const config = { matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'] };
