import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
export type AuthPayload = { sub: string; isAdmin?: boolean };

export function signJWT(payload: AuthPayload, opts?: jwt.SignOptions) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', ...opts });
}

export function setAuthCookie(token: string) {
  cookies().set('token', token, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export function clearAuthCookie() {
  cookies().delete('token');
}

export async function verifyRequest(req?: Request) {
  const c = cookies();
  const token = c.get('token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return payload; // { sub, isAdmin }
  } catch (e) {
    return null;
  }
}