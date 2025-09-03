import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequest } from '@/lib/auth';

export async function POST(req: Request) {
  const payload = await verifyRequest();
  if (!payload?.isAdmin) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const body = await req.json();
  // 範例：批次加幣 { userIds: string[], delta: number }
  const { userIds, delta } = body;
  await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { balance: { increment: delta } } });
  return NextResponse.json({ ok: true });
}