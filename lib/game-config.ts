// lib/game-config.ts
import prisma from "@/lib/prisma";
import { GameCode } from "@prisma/client";

/** 讀 GameConfig.json（BACCARAT, key=room.R##） */
export async function getBaccaratRoomConfig(key: string): Promise<any | null> {
  const row = await prisma.gameConfig.findUnique({ where: { gameCode_key: { gameCode: GameCode.BACCARAT, key } } });
  return row?.json ?? null;
}

/** 寫入/覆蓋 GameConfig.json（BACCARAT, key=room.R##） */
export async function setBaccaratRoomConfig(key: string, json: any) {
  await prisma.gameConfig.upsert({
    where: { gameCode_key: { gameCode: GameCode.BACCARAT, key } },
    update: { json },
    create: { gameCode: GameCode.BACCARAT, key, json },
  });
}
