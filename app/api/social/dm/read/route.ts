import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { threadId, upToMessageId } = await req.json();
    if (!threadId || !upToMessageId) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    const part = await prisma.directParticipant.findFirst({ where: { threadId, userId: me.id } });
    if (!part) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const msgs = await prisma.directMessage.findMany({
      where: {
        threadId,
        id: { lte: upToMessageId },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    await prisma.$transaction(
      msgs.map(m =>
        prisma.directReadReceipt.upsert({
          where: { messageId_userId: { messageId: m.id, userId: me.id } },
          update: {},
          create: { messageId: m.id, userId: me.id },
        }),
      ),
    );

    return NextResponse.json({ ok: true, count: msgs.length });
  } catch (e) {
    console.error('DM_READ', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
