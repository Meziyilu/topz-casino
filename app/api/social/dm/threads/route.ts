import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const parts = await prisma.directParticipant.findMany({
      where: { userId: me.id },
      select: { threadId: true },
    });
    const threadIds = parts.map(p => p.threadId);
    if (!threadIds.length) return NextResponse.json({ ok: true, items: [] });

    const threads = await prisma.directThread.findMany({
      where: { id: { in: threadIds } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, lastMessageAt: true,
        participants: {
          select: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            userId: true,
          },
        },
        messages: {
          take: 1, orderBy: { createdAt: 'desc' }, select: { body: true, kind: true, createdAt: true },
        },
      },
    });

    const items = threads.map(t => {
      const peer = t.participants.map(p => p.user).find(u => u.id !== me.id) || t.participants[0]?.user;
      const last = t.messages[0];
      return {
        id: t.id,
        peer,
        lastSnippet: last ? (last.kind === 'TEXT' ? last.body : '[系統訊息]') : '',
        lastAt: last?.createdAt || t.lastMessageAt,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error('DM_THREADS', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
