// services/bank.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerKind, LedgerTarget } from "@prisma/client";

// 參數統一用「整數點數」，1 = 1 元（如需小數，請在 UI 層乘以 100）
const envInt = (key: string, def: number) => {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

// 可改環境變數控制限制
const BANK_DEPOSIT_MIN   = envInt("BANK_DEPOSIT_MIN",   1);
const BANK_DEPOSIT_MAX   = envInt("BANK_DEPOSIT_MAX",   1_000_000);
const BANK_WITHDRAW_MIN  = envInt("BANK_WITHDRAW_MIN",  1);
const BANK_WITHDRAW_MAX  = envInt("BANK_WITHDRAW_MAX",  1_000_000);
const BANK_TRANSFER_MIN  = envInt("BANK_TRANSFER_MIN",  1);
const BANK_TRANSFER_MAX  = envInt("BANK_TRANSFER_MAX",  1_000_000);
const BANK_DAILY_OUT_MAX = envInt("BANK_DAILY_OUT_MAX", 2_000_000); // 每日銀行流出（提領+轉帳）上限

export async function getBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  // 今日銀行流出金額（WITHDRAW + TRANSFER，amount 為正/負不重要，我們取正值求和）
  const todayOut = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      target: "BANK",
      kind: { in: ["WITHDRAW", "TRANSFER"] },
      createdAt: { gte: start },
    },
  });

  return {
    wallet: user.balance,
    bank: user.bankBalance,
    dailyOut: todayOut._sum.amount ? Math.max(todayOut._sum.amount, 0) : 0,
  };
}

export async function deposit(userId: string, amount: number, memo?: string) {
  if (!Number.isInteger(amount) || amount < BANK_DEPOSIT_MIN || amount > BANK_DEPOSIT_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.balance < amount) throw new Error("WALLET_NOT_ENOUGH");

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
        target: LedgerTarget.BANK,
        kind: LedgerKind.DEPOSIT,
        amount,
        walletAfter: upd.balance,
        bankAfter: upd.bankBalance,
        memo: memo?.slice(0, 120),
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

export async function withdraw(userId: string, amount: number, memo?: string) {
  if (!Number.isInteger(amount) || amount < BANK_WITHDRAW_MIN || amount > BANK_WITHDRAW_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 今日流出
    const todayOut = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        kind: { in: ["WITHDRAW", "TRANSFER"] },
        createdAt: { gte: start },
      },
    });
    const used = todayOut._sum.amount || 0;
    if (used + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

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
        target: LedgerTarget.BANK,
        kind: LedgerKind.WITHDRAW,
        amount,
        walletAfter: upd.balance,
        bankAfter: upd.bankBalance,
        memo: memo?.slice(0, 120),
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

export async function transfer(userId: string, toUserId: string, amount: number, memo?: string) {
  if (userId === toUserId) throw new Error("TRANSFER_TO_SELF");
  if (!Number.isInteger(amount) || amount < BANK_TRANSFER_MIN || amount > BANK_TRANSFER_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true, balance: true } }),
      tx.user.findUnique({ where: { id: toUserId }, select: { id: true, bankBalance: true } }),
    ]);
    if (!from) throw new Error("USER_NOT_FOUND");
    if (!to) throw new Error("TARGET_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 今日流出
    const todayOut = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        kind: { in: ["WITHDRAW", "TRANSFER"] },
        createdAt: { gte: start },
      },
    });
    const used = todayOut._sum.amount || 0;
    if (used + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    const fromUpd = await tx.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
      select: { balance: true, bankBalance: true },
    });
    const toUpd = await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { bankBalance: true },
    });

    await tx.ledger.create({
      data: {
        userId,
        target: LedgerTarget.BANK,
        kind: LedgerKind.TRANSFER,
        amount,
        walletAfter: fromUpd.balance,
        bankAfter: fromUpd.bankBalance,
        memo: memo?.slice(0, 120),
        refUserId: toUserId,
      },
    });
    await tx.ledger.create({
      data: {
        userId: toUserId,
        target: LedgerTarget.BANK,
        kind: LedgerKind.TRANSFER,
        amount,
        walletAfter: 0, // 對方的 walletAfter 沒變（此欄只是展示用途），可填 0 或對方當前錢包
        bankAfter: toUpd.bankBalance,
        memo: `FROM:${userId}`.slice(0, 120),
        refUserId: userId,
      },
    });

    return { wallet: fromUpd.balance, bank: fromUpd.bankBalance };
  });
}

export async function getHistory(userId: string, cursor?: string | null, limit = 20) {
  const items = await prisma.ledger.findMany({
    where: { userId, target: "BANK" },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, createdAt: true, kind: true, amount: true, memo: true, refUserId: true,
      bankAfter: true, walletAfter: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    nextCursor = items[limit].id;
    items.pop();
  }
  return { items, nextCursor };
}
