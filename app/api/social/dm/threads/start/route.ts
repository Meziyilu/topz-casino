import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { peerId } = await req.json();
    if (!peerId || peerId === me.id) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    // 找既有 thread（雙人聊天室）
    const existing = await prisma.directThread.findFirst({
      where: {
        participants: { some: { userId: me.id } },
        AND: [{ participants: { some: { userId: peerId } } }],
      },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: true, id: existing.id });

    const thread = await prisma.directThread.create({
      data: {
        participants: { create: [{ userId: me.id }, { userId: peerId }] },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: thread.id });
  } catch (e) {
    console.error('DM_START', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
