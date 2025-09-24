import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const { threadId, body } = await req.json();
    const text = (body || '').trim();
    if (!threadId || !text) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    // 權限：必須是參與者
    const part = await prisma.directParticipant.findFirst({ where: { threadId, userId: me.id } });
    if (!part) return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });

    const msg = await prisma.directMessage.create({
      data: { threadId, senderId: me.id, kind: 'TEXT', body: text },
      select: { id: true, createdAt: true },
    });

    await prisma.directThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });

    // 自己已讀
    await prisma.directReadReceipt.upsert({
      where: { messageId_userId: { messageId: msg.id, userId: me.id } },
      update: {},
      create: { messageId: msg.id, userId: me.id },
    });

    return NextResponse.json({ ok: true, id: msg.id, createdAt: msg.createdAt });
  } catch (e) {
    console.error('DM_SEND', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
