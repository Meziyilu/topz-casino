// lib/auth.ts
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = (process.env.JWT_SECRET || 'dev_secret') as jwt.Secret;

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload | { uid: string };
    const uid = (payload as any)?.uid;
    if (!uid) return null;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true, email: true, displayName: true, isAdmin: true,
        avatarUrl: true, balance: true, bankBalance: true, vipTier: true, isBanned: true,
      },
    });
    if (!user || user.isBanned) return null;
    return user;
  } catch {
    return null;
  }
}
