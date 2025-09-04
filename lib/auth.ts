// lib/auth.ts
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev_refresh') as jwt.Secret;

const RAW_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const RAW_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '7d';
const ACCESS_TTL = RAW_ACCESS_TTL as SignOptions['expiresIn'];
const REFRESH_TTL = RAW_REFRESH_TTL as SignOptions['expiresIn'];

export function signAccess(uid: string, isAdmin: boolean) {
  return jwt.sign({ uid, isAdmin, typ: 'access' as const }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}
export function signRefresh(uid: string) {
  return jwt.sign({ uid, typ: 'refresh' as const }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function setAuthCookies(res: NextResponse, access: string, refresh: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const accMaxAge = 15 * 60; // 15m
  const refMaxAge = 7 * 24 * 60 * 60; // 7d
  res.cookies.set('token', access, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: accMaxAge });
  res.cookies.set('refresh_token', refresh, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: refMaxAge });
}

export function clearAuth(res: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
}

/**
 * 用寬鬆型別來讀 cookie，避免引入 Next 私有型別。
 * 任何具備 get(name) => { value?: string } 的物件都可用（如 NextRequest.cookies）
 */
export function readAccessFromCookies(cookies: { get: (name: string) => { value?: string } | undefined } | undefined) {
  const token = cookies?.get('token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & { uid: string; isAdmin: boolean; typ: 'access' };
    return payload;
  } catch {
    return null;
  }
}

export async function getMeFromReq(req: NextRequest) {
  const payload = readAccessFromCookies(req.cookies);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  return user ?? null;
}
