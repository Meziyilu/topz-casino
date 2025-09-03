import prisma from '@/lib/prisma';

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function adminAdjustBalance(userId: string, delta: number) {
  return prisma.user.update({ where: { id: userId }, data: { balance: { increment: delta } } });
}