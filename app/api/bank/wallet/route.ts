import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequest } from '@/lib/auth';

export async function GET() {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: p.sub }, select: { balance: true, bankBalance: true } });
  return NextResponse.json({ balance: u?.balance ?? 0, bankBalance: u?.bankBalance ?? 0 });
}