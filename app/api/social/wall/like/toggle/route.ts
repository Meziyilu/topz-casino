export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const ToggleSchema = z.object({ postId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { postId } = ToggleSchema.parse(await req.json());

  const exists = await prisma.wallLike.findUnique({ where: { postId_userId: { postId, userId: me.id } } }).catch(() => null);

  if (exists) {
    await prisma.wallLike.delete({ where: { id: exists.id } });
    return NextResponse.json({ ok: true, liked: false });
  } else {
    await prisma.wallLike.create({ data: { postId, userId: me.id } });
    return NextResponse.json({ ok: true, liked: true });
  }
}
