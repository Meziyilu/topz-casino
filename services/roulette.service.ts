// services/roulette.service.ts
import { PrismaClient, RouletteRoomCode } from "@prisma/client";
const prisma = new PrismaClient();

// === 簡單 RNG：0~36 ===
function rngWheel(): number {
  return Math.floor(Math.random() * 37);
}

// 你已經有的：結算函式（確定簽名只吃 roundId）
export async function settleRound(roundId: string) {
  // 如果你已經有實作，保留原本的；這個只是佔位提醒。
  // ...existing implementation...
}

// === 設定（若 DB 沒有 GameConfig，使用預設） ===
async function getRoomTimers(room: RouletteRoomCode) {
  // 你若已有讀取 GameConfig 的工具可替換
  const betSec = 30;
  const revealSec = 10;
  return { betSec, revealSec };
}

// === 每房唯一 loop 管理 ===
const roomLoops = new Map<RouletteRoomCode, NodeJS.Timeout>();

type Phase = "BETTING" | "REVEALING" | "SETTLED";

async function driveRoom(room: RouletteRoomCode) {
  const { betSec, revealSec } = await getRoomTimers(room);
  const now = new Date();

  // 取最後一局
  const round = await prisma.rouletteRound.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  // 沒局：開新局（BETTING）
  if (!round) {
    await prisma.rouletteRound.create({
      data: {
        room,
        phase: "BETTING" as any,
        startedAt: now,
        result: null,
      },
    });
    return;
  }

  // 依 phase 推進
  if (round.phase === "BETTING") {
    // BETTING 結束點 = startedAt + betSec
    const lockAt = new Date(round.startedAt.getTime() + betSec * 1000);
    if (now >= lockAt) {
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { phase: "REVEALING" as any },
      });
      return;
    }
  }

  if (round.phase === "REVEALING") {
    // REVEALING 期間先補結果（若還沒有）
    if (round.result == null) {
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { result: rngWheel() },
      });
      return;
    }
    // REVEALING 結束點 = startedAt + betSec + revealSec
    const settleAt = new Date(round.startedAt.getTime() + (betSec + revealSec) * 1000);
    if (now >= settleAt) {
      // 呼叫結算
      await settleRound(round.id);
      // 標記 SETTLED
      await prisma.rouletteRound.update({
        where: { id: round.id },
        data: { phase: "SETTLED" as any, endedAt: now },
      });
      // 立刻開下一局
      await prisma.rouletteRound.create({
        data: {
          room,
          phase: "BETTING" as any,
          startedAt: now,
          result: null,
        },
      });
      return;
    }
  }

  if (round.phase === "SETTLED") {
    // 保險：若已結算但沒有下一局（理論上上面會開），就開一局
    const next = await prisma.rouletteRound.findFirst({
      where: { room, startedAt: { gt: round.startedAt } },
      orderBy: { startedAt: "desc" },
    });
    if (!next) {
      await prisma.rouletteRound.create({
        data: {
          room,
          phase: "BETTING" as any,
          startedAt: now,
          result: null,
        },
      });
    }
  }
}

// === 導出的啟動/停止 API ===
export async function startRoomLoop(room: RouletteRoomCode) {
  if (roomLoops.has(room)) {
    return { started: false, reason: "ALREADY_RUNNING" };
  }
  // 先立即推一輪，確保有局
  await driveRoom(room);

  const tick = async () => {
    try {
      await driveRoom(room);
    } catch (e) {
      // 可加上 logger
    } finally {
      const t = setTimeout(tick, 1000);
      roomLoops.set(room, t);
    }
  };
  const t = setTimeout(tick, 1000);
  roomLoops.set(room, t);
  return { started: true };
}

export function stopRoomLoop(room: RouletteRoomCode) {
  const t = roomLoops.get(room);
  if (t) {
    clearTimeout(t);
    roomLoops.delete(room);
    return { stopped: true };
  }
  return { stopped: false, reason: "NOT_RUNNING" };
}
