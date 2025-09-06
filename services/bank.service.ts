// services/bank.service.ts — v1.1.2 對齊：用 Ledger.type / Ledger.target，不使用 walletAfter/bankAfter
import { prisma } from "@/lib/prisma";
import type { LedgerType, BalanceTarget } from "@prisma/client";

// 金額一律用整數，1 = 1 元（UI 若有小數，請在 UI 端 * 100）
const envInt = (k: string, def: number) => {
  const v = process.env[k];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : def;
};

const BANK_DEPOSIT_MIN   = envInt("BANK_DEPOSIT_MIN",   1);
const BANK_DEPOSIT_MAX   = envInt("BANK_DEPOSIT_MAX",   1_000_000);
const BANK_WITHDRAW_MIN  = envInt("BANK_WITHDRAW_MIN",  1);
const BANK_WITHDRAW_MAX  = envInt("BANK_WITHDRAW_MAX",  1_000_000);
const BANK_TRANSFER_MIN  = envInt("BANK_TRANSFER_MIN",  1);
const BANK_TRANSFER_MAX  = envInt("BANK_TRANSFER_MAX",  1_000_000);
const BANK_DAILY_OUT_MAX = envInt("BANK_DAILY_OUT_MAX", 2_000_000);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// 回傳：{ wallet, bank, dailyOut }
export async function getBalances(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");

  // 今日銀行流出 = type ∈ {WITHDRAW, TRANSFER} & target=BANK 的 amount 加總
  const start = todayStart();
  const agg = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      target: "BANK" as BalanceTarget,
      type: { in: ["WITHDRAW", "TRANSFER"] as LedgerType[] },
      createdAt: { gte: start },
    },
  });
  const dailyOut = agg._sum.amount ?? 0;

  return { wallet: u.balance, bank: u.bankBalance, dailyOut };
}

// 存款：錢包 -> 銀行；Ledger: type=DEPOSIT, target=BANK, amount=正值
export async function deposit(userId: string, amount: number, memo?: string) {
  if (!Number.isInteger(amount) || amount < BANK_DEPOSIT_MIN || amount > BANK_DEPOSIT_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
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
        type:   "DEPOSIT",
        target: "BANK",
        amount: amount, // 正值
        memo:   memo?.slice(0, 120) ?? "DEPOSIT",
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

// 提領：銀行 -> 錢包；Ledger: type=WITHDRAW, target=BANK, amount=正值（出帳用 type 表示）
export async function withdraw(userId: string, amount: number, memo?: string) {
  if (!Number.isInteger(amount) || amount < BANK_WITHDRAW_MIN || amount > BANK_WITHDRAW_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!u) throw new Error("USER_NOT_FOUND");
    if (u.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 今日銀行流出額度（WITHDRAW + TRANSFER）
    const start = todayStart();
    const used = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        type: { in: ["WITHDRAW", "TRANSFER"] as LedgerType[] },
        createdAt: { gte: start },
      },
    });
    const usedAmt = used._sum.amount ?? 0;
    if (usedAmt + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

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
        type:   "WITHDRAW",
        target: "BANK",
        amount: amount, // 正值
        memo:   memo?.slice(0, 120) ?? "WITHDRAW",
      },
    });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

// 轉帳：自己銀行 -> 他人銀行；自己記 type=TRANSFER (BANK)，對方記 type=TRANSFER (BANK)
export async function transfer(userId: string, toUserId: string, amount: number, memo?: string) {
  if (userId === toUserId) throw new Error("TRANSFER_TO_SELF");
  if (!Number.isInteger(amount) || amount < BANK_TRANSFER_MIN || amount > BANK_TRANSFER_MAX) {
    throw new Error("BAD_AMOUNT");
  }

  return prisma.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true, balance: true } }),
      tx.user.findUnique({ where: { id: toUserId }, select: { id: true, bankBalance: true } }),
    ]);
    if (!from) throw new Error("USER_NOT_FOUND");
    if (!to)   throw new Error("TARGET_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 今日銀行流出額度
    const start = todayStart();
    const used = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        type: { in: ["WITHDRAW", "TRANSFER"] as LedgerType[] },
        createdAt: { gte: start },
      },
    });
    const usedAmt = used._sum.amount ?? 0;
    if (usedAmt + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    // from 扣銀行
    const fromUpd = await tx.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
      select: { balance: true, bankBalance: true },
    });
    // to 加銀行
    await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { bankBalance: true },
    });

    // 雙邊 ledger（均為正值，通過 type 區分流向）
    await tx.ledger.create({
      data: {
        userId,
        type:   "TRANSFER",
        target: "BANK",
        amount: amount,
        memo:   (memo ?? `TRANSFER_TO:${toUserId}`).slice(0, 120),
      },
    });
    await tx.ledger.create({
      data: {
        userId: toUserId,
        type:   "TRANSFER",
        target: "BANK",
        amount: amount,
        memo:   `FROM:${userId}`.slice(0, 120),
      },
    });

    return { wallet: fromUpd.balance, bank: fromUpd.bankBalance };
  });
}

// 歷史（target=BANK），回 { items, nextCursor }
export async function getHistory(userId: string, cursor?: string | null, limit = 20) {
  const items = await prisma.ledger.findMany({
    where: { userId, target: "BANK" },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      type: true,        // LedgerType
      target: true,      // BalanceTarget
      amount: true,      // 一律正值；利用 type 判斷入/出帳
      memo: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    nextCursor = items[limit].id;
    items.pop();
  }
  return { items, nextCursor };
}
