// services/bank.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerType, BalanceTarget } from "@prisma/client";

// 統一使用「整數點數」，1 = 1 元
const envInt = (k: string, def: number) => {
  const v = parseInt(process.env[k] || "", 10);
  return Number.isFinite(v) ? v : def;
};

// 參數限制（可用環境變數覆蓋）
const DAILY_OUT_MAX = envInt("NEXT_PUBLIC_BANK_DAILY_OUT_MAX", 2_000_000); // 今日銀行流出上限
const DEPOSIT_MIN   = envInt("BANK_DEPOSIT_MIN", 1);
const WITHDRAW_MIN  = envInt("BANK_WITHDRAW_MIN", 1);
const TRANSFER_MIN  = envInt("BANK_TRANSFER_MIN", 1);

/** 當日 00:00:00 */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 取得錢包/銀行餘額與當日銀行流出總額 */
export async function getBalances(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");

  const start = startOfToday();
  const out = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      target: BalanceTarget.BANK,
      type: { in: [LedgerType.WITHDRAW, LedgerType.TRANSFER] },
      createdAt: { gte: start },
    },
  });

  const dailyOut = out._sum.amount || 0;

  return {
    wallet: u.balance,
    bank: u.bankBalance,
    dailyOut,
  };
}

/** 存款（錢包 → 銀行） */
export async function deposit(userId: string, amount: number /* , memo?: string */) {
  if (!Number.isFinite(amount) || amount < DEPOSIT_MIN) throw new Error("BAD_AMOUNT");

  return await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });
    if (!u) throw new Error("USER_NOT_FOUND");
    if (u.balance < amount) throw new Error("INSUFFICIENT_WALLET");

    const upd = await tx.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: amount },
        bankBalance: { increment: amount },
      },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId,
        type: LedgerType.DEPOSIT,
        target: BalanceTarget.BANK,
        amount: amount, // 一律正值；由 type 判斷入/出
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

/** 提領（銀行 → 錢包） */
export async function withdraw(userId: string, amount: number /* , memo?: string */) {
  if (!Number.isFinite(amount) || amount < WITHDRAW_MIN) throw new Error("BAD_AMOUNT");

  return await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { bankBalance: true },
    });
    if (!u) throw new Error("USER_NOT_FOUND");
    if (u.bankBalance < amount) throw new Error("INSUFFICIENT_BANK");

    // 檢查今日流出上限
    const start = startOfToday();
    const out = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: BalanceTarget.BANK,
        type: { in: [LedgerType.WITHDRAW, LedgerType.TRANSFER] },
        createdAt: { gte: start },
      },
    });
    const todayOut = out._sum.amount || 0;
    if (todayOut + amount > DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    const upd = await tx.user.update({
      where: { id: userId },
      data: {
        bankBalance: { decrement: amount },
        balance: { increment: amount },
      },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId,
        type: LedgerType.WITHDRAW,
        target: BalanceTarget.BANK,
        amount: amount,
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

/** 轉帳（銀行 → 他人銀行） */
export async function transfer(userId: string, toUserId: string, amount: number /* , memo?: string */) {
  if (!Number.isFinite(amount) || amount < TRANSFER_MIN) throw new Error("BAD_AMOUNT");
  if (!toUserId || toUserId === userId) throw new Error("BAD_TARGET");

  return await prisma.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true } }),
      tx.user.findUnique({ where: { id: toUserId }, select: { id: true } }),
    ]);
    if (!from) throw new Error("USER_NOT_FOUND");
    if (!to) throw new Error("TARGET_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("INSUFFICIENT_BANK");

    // 檢查今日流出上限
    const start = startOfToday();
    const out = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: BalanceTarget.BANK,
        type: { in: [LedgerType.WITHDRAW, LedgerType.TRANSFER] },
        createdAt: { gte: start },
      },
    });
    const todayOut = out._sum.amount || 0;
    if (todayOut + amount > DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    // 先扣自己，再加對方
    await tx.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
    });
    const updMe = await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { id: true },
    });

    // 雙邊流水（都寫正值）
    await tx.ledger.create({
      data: {
        userId,
        type: LedgerType.TRANSFER,
        target: BalanceTarget.BANK,
        amount: amount,
      },
    });
    await tx.ledger.create({
      data: {
        userId: updMe.id,
        type: LedgerType.TRANSFER,
        target: BalanceTarget.BANK,
        amount: amount,
      },
    });

    // 回傳最新餘額
    const meNow = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });
    if (!meNow) throw new Error("USER_NOT_FOUND_AFTER");

    return { wallet: meNow.balance, bank: meNow.bankBalance };
  });
}

/** 取回最近的 BANK 相關流水（供 /api/bank/history 使用） */
export async function listBankHistory(userId: string, limit = 20, cursor?: string | null) {
  const items = await prisma.ledger.findMany({
    where: { userId, target: BalanceTarget.BANK },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      type: true,
      target: true,
      amount: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const last = items.pop()!;
    nextCursor = last.id;
  }

  return { items, nextCursor };
}
