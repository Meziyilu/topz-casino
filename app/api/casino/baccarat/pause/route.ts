// app/api/admin/baccarat/pause/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { RoomCode } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const room = url.searchParams.get('room') as RoomCode | null;
  const paused = url.searchParams.get('paused');
  if (!room || !['R30','R60','R90'].includes(room)) {
    return NextResponse.json({ ok:false, error:'BAD_ROOM' }, { status:400 });
  }
  const val = paused === 'true' ? 'true' : 'false';
  const key = `baccarat:${room}:paused`;
  await prisma.setting.upsert({ where:{key}, create:{key, value:val}, update:{value:val} });
  return NextResponse.json({ ok:true, room, paused: val === 'true' });
}
