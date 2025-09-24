export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameCode = searchParams.get('gameCode') || 'GLOBAL';
  const roomKey = searchParams.get('roomKey') || 'LOBBY';

  const rows = await prisma.roomPresence.findMany({
    where: { gameCode: gameCode as any, roomKey, leftAt: null },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true, headframe: true } } },
    orderBy: { joinedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ ok: true, items: rows });
}
