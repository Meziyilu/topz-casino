// lib/auth.ts
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;

export async function getUserFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET) as { uid: string; isAdmin?: boolean };
    return { id: payload.uid, isAdmin: !!payload.isAdmin };
  } catch {
    return null;
  }
}
