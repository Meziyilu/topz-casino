export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const PostSchema = z.object({
  blockedId: z.string().cuid(),
  level: z.enum(['CHAT_ONLY','DM_ONLY','ALL']).default('ALL'),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const data = PostSchema.parse(await req.json());
  if (me.id === data.blockedId) return NextResponse.json({ ok: false, error: 'SELF_BLOCK' }, { status: 400 });

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: me.id, blockedId: data.blockedId } },
    create: { blockerId: me.id, blockedId: data.blockedId, level: data.level as any },
    update: { level: data.level as any },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const blockedId = searchParams.get('blockedId') || '';
  if (!blockedId) return NextResponse.json({ ok: false, error: 'blockedId required' }, { status: 400 });

  await prisma.userBlock.deleteMany({ where: { blockerId: me.id, blockedId } });
  return NextResponse.json({ ok: true });
}
