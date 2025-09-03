import { PrismaClient } from "@prisma/client";


// Prevent multiple PrismaClient instances in dev (Next.js hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };


export const prisma: PrismaClient =
globalForPrisma.prisma ??
new PrismaClient({
log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});


if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


export default prisma;