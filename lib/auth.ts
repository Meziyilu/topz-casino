// lib/auth.ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ACCESS_TTL_SEC = 60 * 15;      // 15m
const REFRESH_TTL_SEC = 60 * 60 * 24 * 7; // 7d

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('Missing JWT_SECRET');
  return s;
}

export function signAccessToken(payload: object) {
  return jwt.sign(payload, getSecret(), { algorithm: 'HS256', expiresIn: ACCESS_TTL_SEC });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, getSecret(), { algorithm: 'HS256', expiresIn: REFRESH_TTL_SEC });
}

export function verifyToken<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, getSecret()) as T;
  } catch {
    return null;
  }
}

export function setAuthCookies(userId: string) {
  const c = cookies();
  const access = signAccessToken({ sub: userId, typ: 'access' });
  const refresh = signRefreshToken({ sub: userId, typ: 'refresh' });

  const secure = process.env.NODE_ENV === 'production';

  c.set('token', access, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_TTL_SEC,
  });

  c.set('refresh_token', refresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_TTL_SEC,
  });
}

export function clearAuthCookies() {
  const c = cookies();
  const secure = process.env.NODE_ENV === 'production';
  c.set('token', '', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
  c.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 0 });
}

export function getClientIp(req: NextRequest) {
  // Render/Proxy 會帶 X-Forwarded-For
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.ip ?? '0.0.0.0';
}
