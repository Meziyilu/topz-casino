import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { peerId } = await req.json();
    if (!peerId || peerId === me.id) return NextResponse.json({ ok: false, error: 'BAD_PEER' }, { status: 400 });

    // 找看看是否已有雙方 thread
    const existing = await prisma.directThread.findFirst({
      where: {
        participants: { some: { userId: me.id } },
        AND: [{ participants: { some: { userId: peerId } } }],
      },
      select: { id: true },
    });

    if (existing) return NextResponse.json({ ok: true, id: existing.id });

    // 建立
    const t = await prisma.directThread.create({
      data: {
        participants: {
          create: [{ userId: me.id }, { userId: peerId }],
        },
        lastMessageAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: t.id });
  } catch (e) {
    console.error('DM_START', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
