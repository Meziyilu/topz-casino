import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequest } from '@/lib/auth';

export async function GET(req: Request) {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const url = new URL(req.url);
  const take = Math.min(parseInt(url.searchParams.get('take') || '50'), 200);
  const items = await prisma.ledger.findMany({ where: { userId: p.sub }, orderBy: { createdAt: 'desc' }, take });
  return NextResponse.json({ items });
}