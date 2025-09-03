import { NextResponse } from 'next/server';
import { verifyRequest } from '@/lib/auth';
import { transferWalletToBank, transferBankToWallet } from '@/services/ledger.service';

export async function POST(req: Request) {
  const p = await verifyRequest();
  if (!p) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { direction, amount } = await req.json();
  const res = direction === 'WALLET_TO_BANK'
    ? await transferWalletToBank(p.sub, amount)
    : await transferBankToWallet(p.sub, amount);
  return NextResponse.json({ ok: true, next: res.next });
}