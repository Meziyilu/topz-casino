import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me?.id || !me.isAdmin) return NextResponse.json({ ok: false }, { status: 403 });

    const { userId, title, body, data, channel = 'INAPP' } = await req.json();
    if (!userId || !title) return NextResponse.json({ ok: false, error: 'BAD' }, { status: 400 });

    await prisma.notification.create({
      data: {
        userId, title, body: body || '', channel, data: data || {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN_NOTIFY', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
