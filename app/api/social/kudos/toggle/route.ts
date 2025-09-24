export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { z } from 'zod';

const Schema = z.object({ toUserId: z.string().cuid() });

export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req);
  const { toUserId } = Schema.parse(await req.json());
  if (me.id === toUserId) return NextResponse.json({ ok: false, msg: 'Cannot kudos yourself' }, { status: 400 });

  const exist = await prisma.userKudos.findUnique({ where: { fromUserId_toUserId: { fromUserId: me.id, toUserId } } }).catch(() => null);
  if (exist) {
    await prisma.userKudos.delete({ where: { id: exist.id } });
    return NextResponse.json({ ok: true, kudos: false });
  } else {
    await prisma.userKudos.create({ data: { fromUserId: me.id, toUserId } });
    return NextResponse.json({ ok: true, kudos: true });
  }
}
