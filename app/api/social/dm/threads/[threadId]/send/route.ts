import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { threadId: string } }) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const t = await prisma.directThread.findUnique({
      where: { id: params.threadId },
      include: { participants: { select: { userId: true } } },
    });
    if (!t) return NextResponse.json({ ok: false }, { status: 404 });
    if (!t.participants.some(p => p.userId === me.id)) return NextResponse.json({ ok: false }, { status: 403 });

    const { body } = await req.json();
    const text = (body || '').toString().trim();
    if (!text) return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });

    const msg = await prisma.directMessage.create({
      data: { threadId: params.threadId, senderId: me.id, kind: 'TEXT', body: text },
    });

    await prisma.directThread.update({
      where: { id: params.threadId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ ok: true, id: msg.id });
  } catch (e) {
    console.error('DM_SEND', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
