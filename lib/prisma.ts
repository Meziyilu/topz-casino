// lib/prisma.ts
import { PrismaClient, Prisma } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// 建立單例 PrismaClient，避免 hot-reload 產生多個連線
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// 讓 import { Prisma } from "@/lib/prisma" 可用
export { Prisma };

// 讓 import prisma from "@/lib/prisma" 可用
export default prisma;
