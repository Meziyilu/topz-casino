export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: me.id, blockedId: userId },
        { blockerId: userId, blockedId: me.id },
      ],
    },
  });

  return NextResponse.json({ ok: true, blocked: !!block, block });
}
