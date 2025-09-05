// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// 明確列出無需登入的頁面（含 auth 頁）
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/register',
  '/forgot',
  '/reset',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
]);

// 靜態資源前綴（永遠放行）
const PUBLIC_PREFIXES = [
  '/_next',        // Next 內部
  '/favicon',      // favicon.ico / icons
  '/public',       // 若你真的從 /public 暴露
  '/styles',       // /styles/*.css (你現在的 lobby.css 在這)
  '/images',
  '/assets',
  '/robots.txt',
  '/sitemap.xml',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 公開頁面直接放行
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // 2) 公開前綴直接放行（靜態/內部資源）
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 3) 其餘視為需要登入
  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 4) 驗證 JWT：失敗則導回登入
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

// 僅保護前端頁面；不攔 API
export const config = {
  matcher: [
    '/',                 // 大廳
    '/profile/:path*',
    '/wallet/:path*',
    '/casino/:path*',
    '/admin/:path*',
  ],
};
