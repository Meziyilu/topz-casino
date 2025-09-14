import { prisma } from "@/lib/prisma";
import {
  RoomCode,
  dealRound,
  initShoe,
  nextPhases,
  taipeiDay,
  DealResult,
} from "@/lib/baccarat";
import { settleRound as settleRoundService } from "@/services/baccarat.service";

const DEFAULT_BET_SEC = 30;
const DEFAULT_REVEAL_SEC = 8;

const RUN_MODE: "once" | "loop" = (process.env.BACCARAT_RUN_MODE as any) || "once";
const LOOP_INTERVAL_MS = 1000;

function addSeconds(d: Date, secs: number) {
  return new Date(d.getTime() + secs * 1000);
}

async function getSecondsConfig() {
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: "BACCARAT", key: { in: ["BACCARAT:betSeconds", "BACCARAT:revealSeconds"] } },
    select: { key: true, valueFloat: true, valueInt: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = typeof r.valueFloat === "number" ? r.valueFloat :
              typeof r.valueInt === "number" ? Number(r.valueInt) : undefined;
    if (typeof v === "number" && !Number.isNaN(v)) map.set(r.key, v);
  }
  const bet = map.get("BACCARAT:betSeconds") ?? DEFAULT_BET_SEC;
  const reveal = map.get("BACCARAT:revealSeconds") ?? DEFAULT_REVEAL_SEC;
  return { BET_SEC: Math.max(1, Math.floor(bet)), REVEAL_SEC: Math.max(1, Math.floor(reveal)) };
}

// ✅ 秒數 seed
async function ensureRoomSeed(room: RoomCode) {
  const key = `room:${room}:shoeSeed`;
  const meta = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key } },
  });
  if (!meta) {
    await prisma.gameConfig.create({
      data: { gameCode: "BACCARAT", key, valueInt: Math.floor(Date.now() / 1000) },
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

async function openNewRound(room: RoomCode, BET_SEC: number, REVEAL_SEC: number) {
  const now = new Date();
  const day = taipeiDay(now);
  const seq = (await prisma.round.count({ where: { room, day } })) + 1;

  const seedCfg = await prisma.gameConfig.findUnique({
    where: { gameCode_key: { gameCode: "BACCARAT", key: `room:${room}:shoeSeed` } },
    select: { valueInt: true },
  });
  const seed = Number(seedCfg?.valueInt ?? Math.floor(Date.now() / 1000)); // ✅ 秒數
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

async function tickRoom(room: RoomCode) {
  await ensureRoomSeed(room);
  const { BET_SEC, REVEAL_SEC } = await getSecondsConfig();

  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  const now = new Date();

  if (!r || r.phase === "SETTLED") {
    r = await openNewRound(room, BET_SEC, REVEAL_SEC);
  }

  const cur = nextPhases(now, new Date(r.startedAt));

  if (cur.phase === "REVEALING" && r.phase === "BETTING") {
    const dealt = (() => {
      try {
        const shoe = JSON.parse(r!.shoeJson) as number[];
        return dealRound(shoe);
      } catch {
        return dealRound(initShoe(Math.floor(Date.now() / 1000))); // ✅ 秒數 fallback
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

    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  if (cur.phase === "SETTLED" && r.phase !== "SETTLED") {
    await settleRoundService(r.id);

    const outcome = extractOutcome(r.resultJson);
    await prisma.round.updateMany({
      where: { id: r.id, NOT: { phase: "SETTLED" } },
      data: { phase: "SETTLED", outcome: (outcome as any) ?? null, endedAt: new Date() },
    });
  }
}

async function tickAllRooms() {
  const rooms: RoomCode[] = ["R30", "R60", "R90"];
  for (const room of rooms) {
    try {
      await tickRoom(room);
    } catch (err) {
      console.error(`[auto-baccarat] room ${room} error:`, err);
    }
  }
}

export async function runOnce() {
  await tickAllRooms();
}

async function main() {
  if (RUN_MODE === "once") {
    await runOnce();
    return;
  }
  console.log("[auto-baccarat] loop mode started.");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runOnce();
    await new Promise((r) => setTimeout(r, LOOP_INTERVAL_MS));
  }
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  main().catch((e) => {
    console.error("[auto-baccarat] fatal:", e);
    process.exitCode = 1;
  });
}
