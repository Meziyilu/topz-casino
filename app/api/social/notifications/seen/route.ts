export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ ids: z.array(z.string().cuid()).min(1) });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { ids } = Schema.parse(await req.json());

  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: me.id, seenAt: null },
    data: { seenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
