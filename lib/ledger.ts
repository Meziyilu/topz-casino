// lib/ledger.ts
// 用途：所有與帳本/餘額變動的單點寫入（帶 room/roundId），避免散落各處
import prisma from "@/lib/prisma";

export type LedgerType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "TRANSFER"
  | "BET_PLACED"
  | "PAYOUT"
  | "ADMIN_ADJUST"
  | "CHECKIN_BONUS"
  | "EVENT_REWARD"
  | "TOPUP_BONUS"
  | "EXTERNAL_TOPUP";

export type BalanceTarget = "WALLET" | "BANK";
export type RoomCode = "R30" | "R60" | "R90";

export type WriteLedgerInput = {
  userId: string;
  type: LedgerType;
  target: BalanceTarget;
  amount: number; // >= 0；下注用正數，會自動轉成扣款
  metadata?: Record<string, unknown>;
  room?: RoomCode;
  roundId?: string;
};

export async function writeLedgerAndAffectBalance(input: WriteLedgerInput) {
  const { userId, type, target, amount, room, roundId } = input;
  if (amount < 0) throw new Error("amount must be non-negative");

  return prisma.$transaction(async (tx) => {
    await tx.ledger.create({
      data: { userId, type, target, amount, room, roundId },
    });

    // 下注 = 扣；其他大多數 = 加（若有特殊類型，請在呼叫端先處理）
    const sign = type === "BET_PLACED" ? -1 : 1;

    if (target === "WALLET") {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: sign * amount } },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { bankBalance: { increment: sign * amount } },
      });
    }
  });
}
