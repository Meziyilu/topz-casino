import prisma from './prisma';
import { GameCode } from '@prisma/client';

export async function getConfig<T=unknown>(gameCode: GameCode, key: string): Promise<T | null> {
  const g = await prisma.gameConfig.findUnique({ where: { gameCode_key: { gameCode, key } } });
  return (g?.json as T) ?? (g?.valueString as unknown as T) ?? null;
}

export async function setConfig(gameCode: GameCode, key: string, json: any) {
  return prisma.gameConfig.upsert({
    where: { gameCode_key: { gameCode, key }},
    update: { json },
    create: { gameCode, key, json }
  });
}