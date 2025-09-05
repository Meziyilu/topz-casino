// app/api/auth/logout/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
  return res;
}
