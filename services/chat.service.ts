import prisma from '@/lib/prisma';

export async function postMessage(room: string, userId: string, body: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isMuted: true } });
  if (!u) throw new Error('USER_NOT_FOUND');
  if (u.isMuted) throw new Error('USER_MUTED');
  return prisma.chatMessage.create({ data: { room, userId, body } });
}

export async function getRecent(room: string, limit = 50) {
  return prisma.chatMessage.findMany({ where: { room, hidden: false }, orderBy: { createdAt: 'desc' }, take: limit });
}