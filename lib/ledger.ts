// ==============================
const updated = await tx.user.update({
where: { id: userId },
data: target === "WALLET" ? { balance: next } : { bankBalance: next },
select: { id: true, balance: true, bankBalance: true },
});


await tx.ledger.create({
data: {
userId,
type,
target,
amount: delta,
balanceAfter: target === "WALLET" ? updated.balance : updated.bankBalance,
note: opts.note ?? null,
},
});


return updated;
});
return res;
}


export async function depositToBank(userId: string, amount: number, note?: string) {
if (amount <= 0) throw new Error("amount must be > 0");
await adjustBalance(userId, "WALLET", -amount, "WITHDRAW", { note: note ?? "deposit->bank" });
await adjustBalance(userId, "BANK", amount, "DEPOSIT", { note: note ?? "deposit->bank" });
}


export async function withdrawFromBank(userId: string, amount: number, note?: string) {
if (amount <= 0) throw new Error("amount must be > 0");
await adjustBalance(userId, "BANK", -amount, "WITHDRAW", { note: note ?? "withdraw<-bank" });
await adjustBalance(userId, "WALLET", amount, "DEPOSIT", { note: note ?? "withdraw<-bank" });
}


export async function transferWallet(userId: string, toUserId: string, amount: number, note?: string) {
if (amount <= 0) throw new Error("amount must be > 0");
await adjustBalance(userId, "WALLET", -amount, "TRANSFER", { note: note ?? `transfer->${toUserId}` });
await adjustBalance(toUserId, "WALLET", amount, "TRANSFER", { note: note ?? `transfer<-${userId}` });
}


export async function recordBetPlaced(userId: string, target: BalanceTarget, amount: number, note?: string) {
if (amount <= 0) throw new Error("amount must be > 0");
await adjustBalance(userId, target, -amount, "BET_PLACED", { note });
}


export async function recordPayout(userId: string, target: BalanceTarget, amount: number, note?: string) {
if (amount <= 0) return; // skip zero/negative
await adjustBalance(userId, target, amount, "PAYOUT", { note });
}