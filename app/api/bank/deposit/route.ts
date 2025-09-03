import { NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/auth';
import { depositWallet } from '@/services/ledger.service';

export async function POST(req: Request) {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { amount } = await req.json();
  const res = await depositWallet(p.sub, amount);
  return NextResponse.json({ ok: true, balance: res.next });
}