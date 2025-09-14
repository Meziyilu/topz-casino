/**
 * scripts/auto-baccarat.ts
 * 自動推進百家樂三個房間的局狀態。
 *
 * - 下注 30 秒 + 開獎動畫 8 秒（可從 GameConfig 調整）
 * - 沒有當局 → 自動開新局（補齊 endsAt/day/seq/shoeJson）
 * - REVEALING → 發牌，寫 resultJson
 * - SETTLED   → 結算，寫 outcome / endedAt
 *
 * 可作為單次 cron： `node dist/scripts/auto-baccarat.js`
 * 或常駐輪詢：將 RUN_MODE=loop 或直接改下面 RUN_MODE 預設。
 */

import { prisma } from "@/lib/prisma";
import {
  RoomCode,
  BetSide,
  dealRound,
  initShoe,
  nextPhases,
  settleOne, // 若你只用 services.settleRound 可刪除此 import
  taipeiDay,
  DealResult,
} from "@/lib/baccarat";
import { settleRound as settleRoundService } from "@/services/baccarat.service";

// ====== 基本設定（可動態從 GameConfig 讀取） ======
const DEFAULT_BET_SEC = 30;
const DEFAULT_REVEAL_SEC = 8;

// 若要常駐輪詢，調整這裡
const RUN_MODE: "once" | "loop" = (process.env.BACCARAT_RUN_MODE as any) || "once";
const LOOP_INTERVAL_MS = 1000; // 常駐模式每秒巡檢

// ====== Utils ======
function addSeconds(d: Date, secs: number) {
  return new Date(d.getTime() + secs * 1000);
}

async function getSecondsConfig() {
  // 可選：從 GameConfig 讀取秒數（讀不到就 fallback）
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: "BACCARAT", key: { in: ["BACCARAT:betSeconds", "BACCARAT:revealSeconds"] } },
    select: { key: true, valueFloat: true, valueInt: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = typeof r.valueFloat === "number" ? r.valueFloat :
              typeof r.valueInt === "number" ? r.valueInt : undefined;
    if (typeof v === "number" && !Number.isNaN(v)) map.set(r.key, v);
  }
  const bet = map.get("BACCARAT:betSeconds") ?? DEFAULT_BET_SEC;
  const reveal = map.get("BACCARAT:revealSeconds") ?? DEFAULT_REVEAL_SEC;
  return { BET_SEC: Math.max(1, Math.floor(bet)), REVEAL_SEC: Math.max(1, Math.floor(reveal)) };
}

async function ensureRoomSeed(room: RoomCode) {
  const key = `room:${room}:shoeSeed`;
  const meta = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key } },
  });
  if (!meta) {
    await prisma.gameConfig.create({
      data: { gameCode: "BACCARAT", key, valueInt: Date.now() },
    });
  }
}

function parseResult(json?: string | null): DealResult | null {
  if (!json) return null;
  try { return JSON.parse(json) as DealResult; } catch { return null; }
}
function extractOutcome(json?: string | null): "PLAYER" | "BANKER" | "TIE" | null {
  return (parseResult(json)?.outcome as any) ?? null;
}

// ====== 關鍵：開新局 ======
async function openNewRound(room: RoomCode, BET_SEC: number, REVEAL_SEC: number) {
  const now = new Date();
  const day = taipeiDay(now);                     // 以台北日切
  const seq = (await prisma.round.count({ where: { room, day } })) + 1;

  // 用房間鞋 seed 初始化牌靴
  const seedCfg = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
    select: { valueInt: true },
  });
  const seed = seedCfg?.valueInt ?? Date.now();
  const shoe = initShoe(seed);

  const round = await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      day,
      seq,
      startedAt: now,
      endsAt: addSeconds(now, BET_SEC + REVEAL_SEC),
      shoeJson: JSON.stringify(shoe),
      outcome: null,
    },
  });

  return round;
}

// ====== 關鍵：推進單一房間 ======
async function tickRoom(room: RoomCode) {
  await ensureRoomSeed(room);
  const { BET_SEC, REVEAL_SEC } = await getSecondsConfig();

  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  const now = new Date();

  // 沒有局或上一局已結束 → 開新局
  if (!r || r.phase === "SETTLED") {
    r = await openNewRound(room, BET_SEC, REVEAL_SEC);
  }

  // 照 startedAt 計算目前相位
  const cur = nextPhases(now, new Date(r.startedAt));

  // 進入開獎：發牌 + 保存結果
  if (cur.phase === "REVEALING" && r.phase === "BETTING") {
    const dealt = (() => {
      try {
        const shoe = JSON.parse(r!.shoeJson) as number[];
        return dealRound(shoe);
      } catch {
        return dealRound(initShoe(Date.now()));
      }
    })();

    await prisma.round.updateMany({
      where: { id: r.id, phase: "BETTING" },
      data: {
        phase: "REVEALING",
        endsAt: addSeconds(new Date(r.startedAt), BET_SEC + REVEAL_SEC),
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
      },
    });

    // 重新抓取最新狀態
    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  // 進入結算：派彩 + 結束時間
  if (cur.phase === "SETTLED" && r.phase !== "SETTLED") {
    // 用 services 的結算（內含 Ledger、餘額）
    await settleRoundService(r.id);

    const outcome = extractOutcome(r.resultJson);
    await prisma.round.updateMany({
      where: { id: r.id, NOT: { phase: "SETTLED" } },
      data: { phase: "SETTLED", outcome: (outcome as any) ?? null, endedAt: new Date() },
    });
  }
}

// ====== 主流程 ======
async function tickAllRooms() {
  const rooms: RoomCode[] = ["R30", "R60", "R90"];
  for (const room of rooms) {
    try {
      await tickRoom(room);
    } catch (err) {
      // 獨立房間錯誤不影響其他房
      console.error(`[auto-baccarat] room ${room} error:`, err);
    }
  }
}

// 匯出給其他地方可手動呼叫
export async function runOnce() {
  await tickAllRooms();
}

// 直接執行檔案時的行為
async function main() {
  if (RUN_MODE === "once") {
    await runOnce();
    return;
  }

  // 常駐輪詢模式
  // 在 Render/PM2 等環境下可用環境變數 BACCARAT_RUN_MODE=loop 啟用
  console.log("[auto-baccarat] loop mode started.");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runOnce();
    await new Promise((r) => setTimeout(r, LOOP_INTERVAL_MS));
  }
}

// 一般 Node 執行會有 process，Next.js type-check 時不會呼叫 main（僅型別檢查）
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  // 不要讓型別檢查期執行；真正 node run 時才跑
  // 你可以在 package.json scripts 設定：
  // "auto:baccarat": "BACCARAT_RUN_MODE=once node dist/scripts/auto-baccarat.js"
  // 或 loop 模式：
  // "auto:baccarat:loop": "BACCARAT_RUN_MODE=loop node dist/scripts/auto-baccarat.js"
  main().catch((e) => {
    console.error("[auto-baccarat] fatal:", e);
    process.exitCode = 1;
  });
}
