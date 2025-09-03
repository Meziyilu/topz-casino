import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signJWT, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || u.password !== password) return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
  const token = signJWT({ sub: u.id, isAdmin: u.isAdmin });
  setAuthCookie(token);
  return NextResponse.json({ ok: true, user: { id: u.id, email: u.email, isAdmin: u.isAdmin } });
}