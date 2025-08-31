// lib/bank.ts
import prisma from "@/lib/prisma";

export function readIdempotencyKey(req: Request) {
  // 允許 header 或 body 傳
  return (
    req.headers.get("idempotency-key") ||
    req.headers.get("x-idempotency-key") ||
    null
  );
}

export async function getUserBalances(tx: typeof prisma, userId: string) {
  const u = await tx.user.findUnique({
    where: { id: userId },
    select: { balance: true, bankBalance: true },
  });
  if (!u) throw new Error("USER_NOT_FOUND");
  return u;
}

export function isValidAmount(n: any): n is number {
  return Number.isInteger(n) && n > 0;
}
