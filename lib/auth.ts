// lib/auth.ts 里新增這段
import { NextResponse } from 'next/server';

export function clearAuthCookies(res: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  });
  res.cookies.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  });
  return res;
}
