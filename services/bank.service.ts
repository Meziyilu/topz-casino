// services/bank.service.ts —— 無 kind 欄位版本（以金額正負號表示方向）
// 規格：
// - target: "BANK" / "WALLET"
// - amount: 入帳用「正值」、出帳用「負值」
// - 今日銀行流出(dailyOut)：統計 target=BANK 且 amount<0 的絕對值加總

import { prisma } from "@/lib/prisma";

// 方向標記（如果你的 Ledger.target 不是字面字串，這裡改成你的實際 enum/string）
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
// 每日銀行「流出」上限（只計算銀行方向的負值金額）
const BANK_DAILY_OUT_MAX = envInt("BANK_DAILY_OUT_MAX", 2_000_000);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getBalances(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  // 統計今日銀行「流出」（amount < 0）絕對值總和
  const start = todayStart();
  const out = await prisma.ledger.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      target: "BANK" as Target,
      createdAt: { gte: start },
      amount: { lt: 0 }, // 負值代表流出
    },
  });

  const dailyOutAbs = out._sum.amount ? Math.abs(out._sum.amount) : 0;

  return {
    wallet: user.balance,
    bank: user.bankBalance,
    dailyOut: dailyOutAbs,
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
        balance: { decrement: amount },  // 錢包扣
        bankBalance: { increment: amount }, // 銀行加
      },
      select: { balance: true, bankBalance: true },
    });

    // 銀行方向入帳 -> 正值
    await tx.ledger.create({
      data: {
        userId,
        target: "BANK",
        amount: amount,                // 正值（入帳）
        walletAfter: upd.balance,
        bankAfter: upd.bankBalance,
        memo: memo?.slice(0, 120) ?? "DEPOSIT",
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
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, bankBalance: true } });
    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 當日銀行流出（負值）已用額度
    const start = todayStart();
    const used = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        createdAt: { gte: start },
        amount: { lt: 0 }, // 今日所有銀行流出
      },
    });
    const usedAbs = used._sum.amount ? Math.abs(used._sum.amount) : 0;
    if (usedAbs + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    const upd = await tx.user.update({
      where: { id: userId },
      data: {
        bankBalance: { decrement: amount }, // 銀行扣
        balance: { increment: amount },     // 錢包加
      },
      select: { balance: true, bankBalance: true },
    });

    // 銀行方向出帳 -> 負值
    await tx.ledger.create({
      data: {
        userId,
        target: "BANK",
        amount: -amount,               // 負值（出帳）
        walletAfter: upd.balance,
        bankAfter: upd.bankBalance,
        memo: memo?.slice(0, 120) ?? "WITHDRAW",
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
    const [from, to] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { bankBalance: true, balance: true } }),
      tx.user.findUnique({ where: { id: toUserId }, select: { id: true, bankBalance: true } }),
    ]);
    if (!from) throw new Error("USER_NOT_FOUND");
    if (!to) throw new Error("TARGET_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("BANK_NOT_ENOUGH");

    // 當日銀行流出額度檢查
    const start = todayStart();
    const used = await tx.ledger.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        target: "BANK",
        createdAt: { gte: start },
        amount: { lt: 0 },
      },
    });
    const usedAbs = used._sum.amount ? Math.abs(used._sum.amount) : 0;
    if (usedAbs + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

    // from 扣銀行
    const fromUpd = await tx.user.update({
      where: { id: userId },
      data: { bankBalance: { decrement: amount } },
      select: { balance: true, bankBalance: true },
    });
    // to 加銀行
    const toUpd = await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { bankBalance: true },
    });

    // 寫雙邊 Ledger：from（出帳 -amount）、to（入帳 +amount）
    await tx.ledger.create({
      data: {
        userId,
        target: "BANK",
        amount: -amount, // 出帳
        walletAfter: fromUpd.balance,
        bankAfter: fromUpd.bankBalance,
        memo: (memo ?? `TRANSFER_TO:${toUserId}`).slice(0, 120),
        refUserId: toUserId,
      },
    });
    await tx.ledger.create({
      data: {
        userId: toUserId,
        target: "BANK",
        amount: +amount, // 入帳
        walletAfter: 0, // 對方錢包未變（純展示）
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
      id: true,
      createdAt: true,
      amount: true,        // 正=入帳；負=出帳
      memo: true,
      refUserId: true,
      bankAfter: true,
      walletAfter: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    nextCursor = items[limit].id;
    items.pop();
  }
  return { items, nextCursor };
}
