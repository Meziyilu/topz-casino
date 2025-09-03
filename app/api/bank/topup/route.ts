import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequest } from '@/lib/auth';
import { applyLedger } from '@/lib/ledger';
import { BalanceTarget, LedgerType } from '@prisma/client';

export async function POST(req: Request) {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { amount, provider, refCode } = await req.json();
  await prisma.externalTopup.create({ data: { userId: p.sub, amount, provider, refCode, status: 'COMPLETED' } });
  await applyLedger({ userId: p.sub, type: LedgerType.EXTERNAL_TOPUP, target: BalanceTarget.WALLET, amount });
  return NextResponse.json({ ok: true });
}