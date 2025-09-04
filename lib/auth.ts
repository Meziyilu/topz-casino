// lib/auth.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET || '') as jwt.Secret;
const REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || '') as jwt.Secret;

export type AccessClaims = JwtPayload & {
  uid: string;
  isAdmin?: boolean;
  typ?: 'access' | 'refresh';
};

export function getTokenFromRequest(req: NextRequest) {
  const access = req.cookies.get('token')?.value || '';
  const refresh = req.cookies.get('refresh_token')?.value || '';
  return { access, refresh };
}

export function verifyAccessToken(token: string): { ok: true; claims: AccessClaims } | { ok: false; error: string } {
  if (!JWT_SECRET) return { ok: false, error: 'SERVER_MISCONFIGURED' };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AccessClaims;
    if (decoded.typ && decoded.typ !== 'access') return { ok: false, error: 'WRONG_TOKEN_TYPE' };
    return { ok: true, claims: decoded };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'INVALID_TOKEN' };
  }
}

export function verifyRefreshToken(token: string): { ok: true; claims: AccessClaims } | { ok: false; error: string } {
  if (!REFRESH_SECRET) return { ok: false, error: 'SERVER_MISCONFIGURED' };
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as AccessClaims;
    if (decoded.typ && decoded.typ !== 'refresh') return { ok: false, error: 'WRONG_TOKEN_TYPE' };
    return { ok: true, claims: decoded };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'INVALID_TOKEN' };
  }
}

/**
 * 給 API 使用的一站式驗證：從 request 取 cookie -> 驗證 access token
 */
export function getAuthFromRequest(req: NextRequest):
  | { ok: true; uid: string; isAdmin: boolean }
  | { ok: false; status: number; error: string } {
  const { access } = getTokenFromRequest(req);
  if (!access) return { ok: false, status: 401, error: 'NO_TOKEN' };

  const verified = verifyAccessToken(access);
  if (!verified.ok) return { ok: false, status: 401, error: verified.error };

  const { uid, isAdmin = false } = verified.claims || {};
  if (!uid) return { ok: false, status: 401, error: 'MALFORMED_TOKEN' };
  return { ok: true, uid, isAdmin };
}

/**
 * 設定存取/更新 token 的 cookies（可在 login/refresh 使用）
 */
export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string, opts?: { prod?: boolean; accessMaxAge?: number; refreshMaxAge?: number; }) {
  const isProd = typeof opts?.prod === 'boolean' ? opts.prod : process.env.NODE_ENV === 'production';
  if (accessToken) {
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: opts?.accessMaxAge ?? 60 * 15, // 預設 15 分
    });
  }
  if (refreshToken) {
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: opts?.refreshMaxAge ?? 60 * 60 * 24 * 7, // 預設 7 天
    });
  }
}

/**
 * 登出/清除 cookies
 */
export function clearAuthCookies(res: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 0 });
  return res;
}
