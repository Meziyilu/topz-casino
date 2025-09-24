export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ profileUserId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { profileUserId } = Schema.parse(await req.json());
  if (me.id === profileUserId) return NextResponse.json({ ok: true }); // 造訪自己不記

  await prisma.profileVisit.create({ data: { profileUserId, viewerUserId: me.id } });
  return NextResponse.json({ ok: true });
}
