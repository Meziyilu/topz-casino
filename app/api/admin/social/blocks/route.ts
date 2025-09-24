import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { blockerId, blockedId, level = 'ALL', reason } = await req.json();
    if (!blockerId || !blockedId) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: { level, reason },
      create: { blockerId, blockedId, level, reason },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN_BLOCK', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const blockerId = searchParams.get('blockerId') || '';
    const blockedId = searchParams.get('blockedId') || '';
    if (!blockerId || !blockedId) return NextResponse.json({ ok: false }, { status: 400 });

    await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN_UNBLOCK', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
