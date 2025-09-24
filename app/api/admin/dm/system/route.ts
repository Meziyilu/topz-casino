import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { userId, threadId, body } = await req.json();
    const text = (body || '').toString().trim();
    if (!text) return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });

    let tid = threadId as string | undefined;

    if (!tid && userId) {
      // 找或建一個（admin ↔ user）thread
      const existing = await prisma.directThread.findFirst({
        where: {
          participants: { some: { userId: me.id } },
          AND: [{ participants: { some: { userId } } }],
        },
        select: { id: true },
      });
      if (existing) tid = existing.id;
      else {
        const t = await prisma.directThread.create({
          data: { participants: { create: [{ userId: me.id }, { userId }] } },
          select: { id: true },
        });
        tid = t.id;
      }
    }

    if (!tid) return NextResponse.json({ ok: false, error: 'NO_TARGET' }, { status: 400 });

    const msg = await prisma.directMessage.create({
      data: { threadId: tid, kind: 'SYSTEM', body: text },
      select: { id: true },
    });

    await prisma.directThread.update({ where: { id: tid }, data: { lastMessageAt: new Date() } });

    return NextResponse.json({ ok: true, id: msg.id, threadId: tid });
  } catch (e) {
    console.error('ADMIN_DM_SYSTEM', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
