// lib/auth.ts
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
export const ACCESS_TTL: SignOptions['expiresIn'] = RAW_ACCESS_TTL as any;
export const REFRESH_TTL: SignOptions['expiresIn'] = RAW_REFRESH_TTL as any;

export const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
export const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev_refresh') as jwt.Secret;

export function ttlToSeconds(ttl: SignOptions['expiresIn']): number {
  if (typeof ttl === 'number') return ttl;
  const s = String(ttl);
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 3600;
  }
}

export function signAccess(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
}
export function signRefresh(payload: object) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL } as SignOptions);
}

export function setAuthCookies(res: NextResponse, access: string, refresh: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('token', access, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ttlToSeconds(ACCESS_TTL),
  });
  res.cookies.set('refresh_token', refresh, {
    httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ttlToSeconds(REFRESH_TTL),
  });
}

export function clearAuthCookies(res: NextResponse) {
  const past = new Date(0);
  res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', expires: past });
  res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', expires: past });
}

export function getAuthFromRequest(req: NextRequest): (JwtPayload & { uid: string; isAdmin?: boolean }) | null {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { uid: string; isAdmin?: boolean };
    if (!decoded?.uid) return null;
    return decoded;
  } catch {
    return null;
  }
}
