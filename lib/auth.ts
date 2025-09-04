// lib/auth.ts
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

export type AuthContext = {
  uid: string;
  isAdmin?: boolean;
} | null;

export function getAuthFromRequest(req: NextRequest): AuthContext {
  try {
    const raw = req.cookies.get('token')?.value;
    if (!raw) return null;
    const secret = (process.env.JWT_SECRET || '') as jwt.Secret;
    const decoded = jwt.verify(raw, secret) as any;
    if (!decoded?.uid) return null;
    return { uid: String(decoded.uid), isAdmin: !!decoded.isAdmin };
  } catch {
    return null;
  }
}
