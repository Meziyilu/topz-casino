// register
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({
  provider: z.string().min(1), // 'webpush' | 'expo' ...
  token: z.string().min(1),
  deviceInfo: z.any().optional(),
});

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { provider, token, deviceInfo } = Schema.parse(await req.json());

  await prisma.pushToken.upsert({
    where: { provider_token: { provider, token } },
    create: { userId: me.id, provider, token, deviceInfo },
    update: { userId: me.id, deviceInfo, revokedAt: null },
  });

  return NextResponse.json({ ok: true });
}
