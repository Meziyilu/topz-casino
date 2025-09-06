// services/bank.service.ts  —— 無 Prisma enum 版本（用字串 union）
// 如未來在 Prisma 新增 enum LedgerKind/LedgerTarget，再把最上方兩個 type 換回 Prisma 的 enum

import { prisma } from "@/lib/prisma";

// ===== 如果你日後在 Prisma 定義 enum，可改用：
// import { Prisma } from "@prisma/client";
// type Kind = Prisma.LedgerKind;
// type Target = Prisma.LedgerTarget;
// ===== 目前用字面字串，與資料庫中的文字對應 =====
type Kind =
  | "DEPOSIT"   // 錢包→銀行
  | "WITHDRAW"  // 銀行→錢包
  | "TRANSFER"  // 銀行→他人銀行
  | "ADJUST"
  | "BONUS"
  | "WIN"
  | "LOSE";

type Target = "WALLET" | "BANK";

// 參數統一用「整數點數」，1 = 1 元
const envInt = (key: string, def: number) => {
  const v = process.env[key];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

// 可用環境變數覆蓋
const BANK_DEPOSIT_MIN   = envInt("BANK_DEPOSIT_MIN",   1);
const BANK_DEPOSIT_MAX   = envInt("BANK_DEPOSIT_MAX",   1_000_000);
const BANK_WITHDRAW_MIN  = envInt("BANK_WITHDRAW_MIN",  1);
const BANK_WITHDRAW_MAX  = envInt("BANK_WITHDRAW_MAX",  1_000_000);
const BANK_TRANSFER_MIN  = envInt("BANK_TRANSFER_MIN",  1);
const BANK_TRANSFER_MAX  = envInt("BANK_TRANSFER_MAX",  1_000_000);
const BANK_DAILY_OUT_MAX = envInt("BANK_DAILY_OUT_MAX", 2_000_000);

export async function getBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const todayOut = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      target: "BANK" as Target,
      kind: { in: ["WITHDRAW", "TRANSFER"] as Kind[] },
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
        target: "BANK",
        kind: "DEPOSIT",
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    const todayOut = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        kind: { in: ["WITHDRAW", "TRANSFER"] as Kind[] },
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
        target: "BANK",
        kind: "WITHDRAW",
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true, balance: true } }),
      tx.user.findUnique({ where: { id: toUserId }, select: { id: true, bankBalance: true } }),
    ]);
    if (!from) throw new Error("USER_NOT_FOUND");
    if (!to) throw new Error("TARGET_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    const todayOut = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        kind: { in: ["WITHDRAW", "TRANSFER"] as Kind[] },
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
        target: "BANK",
        kind: "TRANSFER",
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
        target: "BANK",
        kind: "TRANSFER",
        amount,
        walletAfter: 0, // 對方錢包未變更（純展示）
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
