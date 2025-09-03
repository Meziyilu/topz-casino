import { NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/auth';
import { claimCheckin } from '@/services/checkin.service';

export async function POST() {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const res = await claimCheckin(p.sub);
  return NextResponse.json(res);
}