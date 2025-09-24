export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  const [following, followers] = await Promise.all([
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.follow.count({ where: { followeeId: userId } }),
  ]);

  return NextResponse.json({ ok: true, following, followers });
}
