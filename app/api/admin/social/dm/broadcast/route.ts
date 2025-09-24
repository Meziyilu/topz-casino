import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { userIds, body } = await req.json();
    const text = (body || '').trim();
    if (!text) return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });

    const targets: string[] = Array.isArray(userIds) && userIds.length
      ? userIds
      : (await prisma.user.findMany({ select: { id: true }, where: { isBanned: false } })).map(u => u.id);

    for (const uid of targets) {
      // 找或建單人 thread（admin → uid）
      const ex = await prisma.directThread.findFirst({
        where: {
          participants: { some: { userId: me.id } },
          AND: [{ participants: { some: { userId: uid } } }],
        },
        select: { id: true },
      });
      const threadId = ex
        ? ex.id
        : (await prisma.directThread.create({
            data: { participants: { create: [{ userId: me.id }, { userId: uid }] } },
            select: { id: true },
          })).id;

      await prisma.directMessage.create({
        data: { threadId, senderId: me.id, kind: 'SYSTEM', body: text },
      });
      await prisma.directThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
    }

    return NextResponse.json({ ok: true, count: targets.length });
  } catch (e) {
    console.error('ADMIN_DM_BROADCAST', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
