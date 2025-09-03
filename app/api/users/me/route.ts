import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequest } from '@/lib/auth';

export async function GET() {
  const payload = await verifyRequest();
  if (!payload) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return NextResponse.json({ user });
}