// lib/locks.ts
import { prisma } from "@/lib/prisma";

// 使用 Postgres advisory lock，避免多實例同時結算/開新局
export async function withAdvisoryLock<T>(key: number, fn: () => Promise<T>): Promise<T> {
  // pg_advisory_lock 是阻塞式；用 try 版避免阻塞
  const got = await prisma.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
    SELECT pg_try_advisory_lock(${key})
  `;
  if (!got?.[0]?.pg_try_advisory_lock) {
    // 沒搶到鎖，直接略過
    // 你也可以 return Promise.resolve(null as any) 依需求調整
    throw new Error("LOCK_NOT_ACQUIRED");
  }
  try {
    const out = await fn();
    return out;
  } finally {
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${key})`);
  }
}
