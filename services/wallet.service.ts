// services/wallet.service.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, BalanceTarget, LedgerType } from "@prisma/client";

/** 讀環境變數（整數，含預設） */
const envInt = (key: string, def: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : def;
};

// 單筆與每日上限（自行調整）
const BANK_SINGLE_MAX = envInt("BANK_SINGLE_MAX", 1_000_000);       // 單筆上限
const BANK_DAILY_OUT_MAX = envInt("BANK_DAILY_OUT_MAX", 2_000_000); // 每日銀行流出上限

/** 取「台北時間的今天 00:00」Date，避免時區誤差 */
function startOfTodayInTaipei(): Date {
  const fmt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find(p => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find(p => p.type === "month")?.value ?? "01");
  const d = Number(parts.find(p => p.type === "day")?.value ?? "01");
  const iso = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T00:00:00+08:00`;
  return new Date(iso);
}

/** 可寫進 Ledger 的追蹤欄位（方便報表/對帳） */
export type LedgerMeta = {
  roundId?: string;          // 百家樂 roundId
  room?: any;                // RoomCode
  sicboRoundId?: string;     // 骰寶 roundId
  sicboRoom?: any;           // SicBoRoomCode
};

export async function getBalances(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");
  return { wallet: u.balance, bank: u.bankBalance };
}

/* =========================== Tx 版本（建議用於下注/派彩） =========================== */

/** 在「既有 transaction」裡加錢並寫 Ledger（amount 正數） */
export async function creditTx(
  tx: Prisma.TransactionClient,
  userId: string,
  target: BalanceTarget,
  amount: number,
  type: LedgerType,
  meta?: LedgerMeta
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("AMOUNT_INVALID");

  const upd = await tx.user.update({
    where: { id: userId },
    data: target === "WALLET"
      ? { balance: { increment: amount } }
      : { bankBalance: { increment: amount } },
    select: { balance: true, bankBalance: true },
  });

  await tx.ledger.create({
    data: {
      userId, type, target, amount,
      roundId: meta?.roundId, room: meta?.room,
      sicboRoundId: meta?.sicboRoundId, sicboRoom: meta?.sicboRoom,
    },
  });

  return { wallet: upd.balance, bank: upd.bankBalance };
}

/** 在「既有 transaction」裡扣錢並寫 Ledger（amount 正數；方向靠 type/target） */
export async function debitTx(
  tx: Prisma.TransactionClient,
  userId: string,
  target: BalanceTarget,
  amount: number,
  type: LedgerType,
  meta?: LedgerMeta
) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("AMOUNT_INVALID");

  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");

  const cur = target === "WALLET" ? u.balance : u.bankBalance;
  if (cur < amount) throw new Error("INSUFFICIENT_BALANCE");

  const upd = await tx.user.update({
    where: { id: userId },
    data: target === "WALLET"
      ? { balance: { decrement: amount } }
      : { bankBalance: { decrement: amount } },
    select: { balance: true, bankBalance: true },
  });

  await tx.ledger.create({
    data: {
      userId, type, target, amount,
      roundId: meta?.roundId, room: meta?.room,
      sicboRoundId: meta?.sicboRoundId, sicboRoom: meta?.sicboRoom,
    },
  });

  return { wallet: upd.balance, bank: upd.bankBalance };
}

/* =========================== 非 Tx 版本（相容舊呼叫） =========================== */

/** 加錢（正向），只寫一邊餘額 + 一筆 Ledger（amount 一律正數） */
export async function credit(
  userId: string,
  target: BalanceTarget,
  amount: number,
  type: LedgerType,
  meta?: LedgerMeta
) {
  return prisma.$transaction((tx) => creditTx(tx, userId, target, amount, type, meta));
}

/** 扣錢（負向邏輯，但 Ledger.amount 仍記正數；方向靠 type/target） */
export async function debit(
  userId: string,
  target: BalanceTarget,
  amount: number,
  type: LedgerType,
  meta?: LedgerMeta
) {
  return prisma.$transaction((tx) => debitTx(tx, userId, target, amount, type, meta));
}

/** 錢包↔銀行：移轉；Ledger 只記「到達的那一邊」 */
export async function move(
  userId: string,
  from: BalanceTarget,
  to: BalanceTarget,
  amount: number,
  type: LedgerType // 對銀行而言：DEPOSIT=錢包→銀行；WITHDRAW=銀行→錢包
) {
  if (from === to) throw new Error("TARGET_SAME");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("AMOUNT_INVALID");
  if (amount > BANK_SINGLE_MAX) throw new Error("SINGLE_LIMIT");

  return await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true, bankBalance: true },
    });
    if (!u) throw new Error("USER_NOT_FOUND");

    const fromBal = from === "WALLET" ? u.balance : u.bankBalance;
    if (fromBal < amount) throw new Error("INSUFFICIENT_BALANCE");

    await tx.user.update({
      where: { id: userId },
      data: from === "WALLET"
        ? { balance: { decrement: amount } }
        : { bankBalance: { decrement: amount } },
    });

    const upd = await tx.user.update({
      where: { id: userId },
      data: to === "WALLET"
        ? { balance: { increment: amount } }
        : { bankBalance: { increment: amount } },
      select: { balance: true, bankBalance: true },
    });

    await tx.ledger.create({ data: { userId, type, target: to, amount } });

    return { wallet: upd.balance, bank: upd.bankBalance };
  });
}

/** 銀行 → 他人銀行（雙邊變動；各寫一筆 Ledger TRANSFER target=BANK） */
export async function transferBankToOther(
  fromUserId: string,
  toUserId: string,
  amount: number
) {
  if (fromUserId === toUserId) throw new Error("SAME_USER");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("AMOUNT_INVALID");
  if (amount > BANK_SINGLE_MAX) throw new Error("SINGLE_LIMIT");

  // 每日流出限制
  const todayOut = await getDailyOutSum(fromUserId);
  if (todayOut + amount > BANK_DAILY_OUT_MAX) throw new Error("DAILY_OUT_LIMIT");

  return await prisma.$transaction(async (tx) => {
    const from = await tx.user.findUnique({ where: { id: fromUserId }, select: { bankBalance: true } });
    if (!from) throw new Error("USER_NOT_FOUND");
    if (from.bankBalance < amount) throw new Error("INSUFFICIENT_BALANCE");

    const to = await tx.user.findUnique({ where: { id: toUserId }, select: { id: true } });
    if (!to) throw new Error("TO_USER_NOT_FOUND");

    await tx.user.update({ where: { id: fromUserId }, data: { bankBalance: { decrement: amount } } });
    const updTo = await tx.user.update({
      where: { id: toUserId },
      data: { bankBalance: { increment: amount } },
      select: { bankBalance: true },
    });

    await tx.ledger.create({ data: { userId: fromUserId, type: "TRANSFER", target: "BANK", amount } });
    await tx.ledger.create({ data: { userId: toUserId,   type: "TRANSFER", target: "BANK", amount } });

    const updFrom = await tx.user.findUnique({
      where: { id: fromUserId },
      select: { balance: true, bankBalance: true },
    });

    return {
      from: { wallet: updFrom!.balance, bank: updFrom!.bankBalance },
      to: { bank: updTo.bankBalance },
    };
  });
}

/** 今日（台北）銀行流出總額：WITHDRAW + TRANSFER，target = BANK */
export async function getDailyOutSum(userId: string) {
  const start = startOfTodayInTaipei();
  const agg = await prisma.ledger.aggregate({
    where: {
      userId,
      target: "BANK",
      type: { in: ["WITHDRAW", "TRANSFER"] },
      createdAt: { gte: start },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** 取歷史（分頁） */
export async function listLedgers(
  userId: string,
  opts: { target?: BalanceTarget; limit?: number; cursor?: string }
) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const where: any = { userId };
  if (opts.target) where.target = opts.target;

  const items = await prisma.ledger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: { id: true, type: true, target: true, amount: true, createdAt: true },
  });
  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop()!;
    nextCursor = next.id;
  }
  return { items, nextCursor };
}
