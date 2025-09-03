import prisma from '@/lib/prisma';
import { StatPeriod } from '@prisma/client';

export async function getTopNetProfit(period: StatPeriod, limit = 20) {
  return prisma.userStatSnapshot.findMany({
    where: { period },
    orderBy: [{ netProfit: 'desc' }],
    take: limit,
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } }
  });
}