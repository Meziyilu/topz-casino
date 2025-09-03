import { applyLedger } from '@/lib/ledger';
import { BalanceTarget, LedgerType, RoomCode, SicBoRoomCode } from '@prisma/client';

export async function depositWallet(userId: string, amount: number) {
  return applyLedger({ userId, type: LedgerType.DEPOSIT, target: BalanceTarget.WALLET, amount });
}
export async function withdrawWallet(userId: string, amount: number) {
  return applyLedger({ userId, type: LedgerType.WITHDRAW, target: BalanceTarget.WALLET, amount: -amount });
}
export async function transferWalletToBank(userId: string, amount: number) {
  await applyLedger({ userId, type: LedgerType.TRANSFER, target: BalanceTarget.WALLET, amount: -amount });
  return applyLedger({ userId, type: LedgerType.TRANSFER, target: BalanceTarget.BANK, amount });
}
export async function transferBankToWallet(userId: string, amount: number) {
  await applyLedger({ userId, type: LedgerType.TRANSFER, target: BalanceTarget.BANK, amount: -amount });
  return applyLedger({ userId, type: LedgerType.TRANSFER, target: BalanceTarget.WALLET, amount });
}

export async function betPlaced(userId: string, amount: number, room?: RoomCode, sicboRoom?: SicBoRoomCode, meta?: { roundId?: string; sicboRoundId?: string; }) {
  return applyLedger({ userId, type: LedgerType.BET_PLACED, target: BalanceTarget.WALLET, amount: -amount, room, sicboRoom, ...meta });
}
export async function payout(userId: string, amount: number, room?: RoomCode, sicboRoom?: SicBoRoomCode, meta?: { roundId?: string; sicboRoundId?: string; }) {
  return applyLedger({ userId, type: LedgerType.PAYOUT, target: BalanceTarget.WALLET, amount, room, sicboRoom, ...meta });
}