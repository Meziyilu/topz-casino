import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { threadId: string } }) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const t = await prisma.directThread.findUnique({
      where: { id: params.threadId },
      include: {
        participants: { select: { userId: true } },
      },
    });
    if (!t) return NextResponse.json({ ok: false }, { status: 404 });
    if (!t.participants.some(p => p.userId === me.id)) return NextResponse.json({ ok: false }, { status: 403 });

    const msgs = await prisma.directMessage.findMany({
      where: { threadId: params.threadId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, displayName: true } } },
      take: 200,
    });

    const items = msgs.map(m => ({
      id: m.id,
      kind: m.kind,
      body: m.body,
      createdAt: m.createdAt,
      sender: m.sender ? { id: m.sender.id, displayName: m.sender.displayName } : null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('DM_GET', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
