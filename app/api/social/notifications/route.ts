export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  const rows = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return NextResponse.json({ ok: true, items: rows, nextCursor });
}
