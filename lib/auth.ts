// lib/auth.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const ACCESS_TTL_SEC = 15 * 60; // 15m
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60; // 7d

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export type JwtPayload = {
  sub: string; // userId
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
};

export function signAccessToken(userId: string) {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ sub: userId, typ: 'access' }, secret, { expiresIn: ACCESS_TTL_SEC });
}

export function signRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET!;
  return jwt.sign({ sub: userId, typ: 'refresh' }, secret, { expiresIn: REFRESH_TTL_SEC });
}

export function verifyAccess(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET!;
  return jwt.verify(token, secret) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET!;
  return jwt.verify(token, secret) as JwtPayload;
}

export function setAuthCookies(access: string, refresh: string) {
  const jar = cookies();
  jar.set('token', access, { ...cookieBase, maxAge: ACCESS_TTL_SEC });
  jar.set('refresh_token', refresh, { ...cookieBase, maxAge: REFRESH_TTL_SEC });
}

export function clearAuthCookies() {
  const jar = cookies();
  jar.set('token', '', { ...cookieBase, maxAge: 0 });
  jar.set('refresh_token', '', { ...cookieBase, maxAge: 0 });
}

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function getClientIp(req: NextRequest): string | undefined {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? undefined;
}
