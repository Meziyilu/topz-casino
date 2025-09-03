import prisma from './prisma';
import { BalanceTarget, LedgerType, RoomCode, SicBoRoomCode } from '@prisma/client';

export async function applyLedger(opts: {
  userId: string;
  type: LedgerType;
  target: BalanceTarget;
  amount: number; // 正數：入帳；負數：扣款
  roundId?: string;
  room?: RoomCode;
  sicboRoundId?: string;
  sicboRoom?: SicBoRoomCode;
}) {
  const { userId, type, target, amount } = opts;
  if (!Number.isInteger(amount)) throw new Error('amount must be int');
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!user) throw new Error('USER_NOT_FOUND');

    const field = target === 'WALLET' ? 'balance' : 'bankBalance';
    const current = user[field];
    const next = current + amount;
    if (next < 0) throw new Error('INSUFFICIENT_FUNDS');

    await tx.user.update({ where: { id: userId }, data: { [field]: next } });
    const ledger = await tx.ledger.create({ data: { ...opts, amount: Math.abs(amount) } });
    return { next, ledger };
  });
}