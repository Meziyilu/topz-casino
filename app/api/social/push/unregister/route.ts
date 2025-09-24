// unregister: app/api/social/push/unregister/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ provider: z.string().min(1), token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { provider, token } = Schema.parse(await req.json());

  await prisma.pushToken.updateMany({
    where: { provider, token, userId: me.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
