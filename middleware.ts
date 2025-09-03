// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token || !process.env.JWT_SECRET) return false;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    // @ts-ignore
    return p?.typ === 'access';
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 不保護的路徑
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // 只保護首頁（大廳）
  if (pathname === '/') {
    if (!isAuthed(req)) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', '/');
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!.*\\.).*)'], // 保留靜態檔案
};
