export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'LOBBY';
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

  const rows = await prisma.chatMessage.findMany({
    where: { room, hidden: false },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true, headframe: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = rows.length > limit ? rows.pop()!.id : null;
  return NextResponse.json({ ok: true, items: rows.reverse(), nextCursor });
}
