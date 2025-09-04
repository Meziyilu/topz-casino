// middleware.ts（可選）
import { NextRequest, NextResponse } from 'next/server';
const OPEN = new Set(['/','/login','/register','/forgot','/reset']);

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (OPEN.has(p) || p.startsWith('/_next') || p.startsWith('/favicon') || p.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/profile/:path*', '/wallet/:path*', '/casino/:path*', '/admin/:path*'] };
