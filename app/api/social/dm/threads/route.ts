import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const parts = await prisma.directParticipant.findMany({
      where: { userId: me.id },
      include: {
        thread: {
          include: {
            participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { body: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    });

    const items = parts.map((p) => {
      const other = p.thread.participants.find((pp) => pp.userId !== me.id)?.user;
      const last = p.thread.messages[0];
      return {
        id: p.threadId,
        peer: other || null,
        lastSnippet: last?.body || null,
        lastAt: last?.createdAt || null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('DM_THREADS', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
