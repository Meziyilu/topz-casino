// services/bank.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerType, BalanceTarget } from "@prisma/client";

/** 參數統一用整數（1 = 1 元）；若要支援小數請在 UI 乘以 100 後送入 */
const envInt = (k: string, def: number) => {
  const v = parseInt(process.env[k] || "", 10);
  return Number.isFinite(v) ? v : def;
};

// 風險控管 / 上下限（可用環境變數調）
const MIN_DEPOSIT   = envInt("BANK_MIN_DEPOSIT", 1);
const MIN_WITHDRAW  = envInt("BANK_MIN_WITHDRAW", 1);
const MIN_TRANSFER  = envInt("BANK_MIN_TRANSFER", 1);
const MAX_DAILY_OUT = envInt("BANK_DAILY_OUT_MAX", 1_000_000_000);

export async function getBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  return {
    wallet: user?.balance ?? 0,
    bank: user?.bankBalance ?? 0,
  };
}

/** 今日銀行流出（WITHDRAW + TRANSFER） */
export async function getTodayOut(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const out = await prisma.ledger.aggregate({
    where: {
      userId,
      target: BalanceTarget.BANK,
      type: { in: [LedgerType.WITHDRAW, LedgerType.TRANSFER] },
      createdAt: { gte: start },
    },
    _sum: { amount: true },
  });

  // 注意：這裡 amount 一律是「正值」表示入帳；為了統一，我們在寫入 WITHDRAW/TRANSFER 時也用正值，
  // 所以「今日流出」就是這些正值的合計。
  return out._sum.amount ?? 0;
}

/** 存款（錢包 → 銀行） */
export async function deposit(userId: string, amount: number, _memo?: string) {
  if (!Number.isInteger(amount) || amount < MIN_DEPOSIT) {
    throw new Error("AMOUNT_INVALID");
  }

  return await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!u) throw new Error("USER_NOT_FOUND");
    if (u.balance < amount) throw new Error("WALLET_NOT_ENOUGH");

    const upd = await tx.user.update({
      where: { id: userId },
      data: {
        balance:     { decrement: amount },
        bankBalance: { increment: amount },
      },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId,
        type:   LedgerType.DEPOSIT,
        target: BalanceTarget.BANK,
        amount: amount, // 正值
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

/** 提領（銀行 → 錢包），含日流出上限 */
export async function withdraw(userId: string, amount: number, _memo?: string) {
  if (!Number.isInteger(amount) || amount < MIN_WITHDRAW) {
    throw new Error("AMOUNT_INVALID");
  }

  return await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true } });
    if (!u) throw new Error("USER_NOT_FOUND");
    if (u.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 檢查今日流出上限
    const todayOut = await getTodayOut(userId);
    if (todayOut + amount > MAX_DAILY_OUT) throw new Error("DAILY_OUT_LIMIT");

    const upd = await tx.user.update({
      where: { id: userId },
      data: {
        bankBalance: { decrement: amount },
        balance:     { increment: amount },
      },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId,
        type:   LedgerType.WITHDRAW,
        target: BalanceTarget.BANK,
        amount: amount, // 正值
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

/** 轉帳（銀行 → 他人銀行），含日流出上限 */
export async function transfer(userId: string, toUserId: string, amount: number, _memo?: string) {
  if (!Number.isInteger(amount) || amount < MIN_TRANSFER) {
    throw new Error("AMOUNT_INVALID");
  }
  if (userId === toUserId) throw new Error("SELF_TRANSFER_NOT_ALLOWED");

  return await prisma.$transaction(async (tx) => {
    const self = await tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true } });
    if (!self) throw new Error("USER_NOT_FOUND");
    if (self.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 檢查今日流出上限
    const todayOut = await getTodayOut(userId);
    if (todayOut + amount > MAX_DAILY_OUT) throw new Error("DAILY_OUT_LIMIT");

    // 扣自己、加對方
    await tx.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
    });
    const rx = await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { bankBalance: true },
    });

    // 雙邊 Ledger（兩筆）
    await tx.ledger.createMany({
      data: [
        {
          userId,
          type:   LedgerType.TRANSFER,
          target: BalanceTarget.BANK,
          amount: amount,
        },
        {
          userId: toUserId,
          type:   LedgerType.TRANSFER,
          target: BalanceTarget.BANK,
          amount: amount,
        },
      ],
    });

    const me = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });

    return { wallet: me!.balance, bank: me!.bankBalance, recipientBank: rx.bankBalance };
  });
}

/** 銀行歷程（只抓 target=BANK） */
export async function getHistory(userId: string, cursor?: string, limit = 20) {
  const where = { userId, target: BalanceTarget.BANK } as const;
  const items = await prisma.ledger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
