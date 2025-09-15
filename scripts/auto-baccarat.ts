// scripts/auto-baccarat.ts
import { prisma } from "@/lib/prisma";
import { RoomCode, RoundPhase } from "@prisma/client";
import { initShoe, dealRound, nextPhases, taipeiDay } from "@/lib/baccarat";

/** 讀秒數設定（抓不到就用預設） */
async function readSeconds() {
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: "BACCARAT", key: { in: ["BACCARAT:betSeconds", "BACCARAT:revealSeconds"] } },
    select: { key: true, valueInt: true, valueFloat: true },
  });
  const toNum = (v: any) =>
    typeof v === "number"
      ? v
      : typeof v === "bigint"
      ? Number(v)
      : undefined;

  const map = new Map<string, number>();
  for (const r of rows) {
    const n = toNum(r.valueInt) ?? (typeof r.valueFloat === "number" ? r.valueFloat : undefined);
    if (typeof n === "number" && Number.isFinite(n)) map.set(r.key, Math.floor(n));
  }

  const bet = Math.max(1, map.get("BACCARAT:betSeconds") ?? 30);
  const rev = Math.max(1, map.get("BACCARAT:revealSeconds") ?? 8);
  return { bet, rev };
}

/** 開新局（含日切與連續 shoe） */
async function openNewRound(room: RoomCode, bet: number, rev: number) {
  const now = new Date();
  const day = taipeiDay(now);
  const seq = (await prisma.round.count({ where: { room, day } })) + 1;

  // 沒有上一副鞋就產新的
  const shoe = initShoe();

  const r = await prisma.round.create({
    data: {
      room,
      phase: "BETTING",
      day,
      seq,
      startedAt: now,
      endsAt: new Date(now.getTime() + (bet + rev) * 1000),
      shoeJson: JSON.stringify(shoe),
      outcome: null,
    },
  });
  return r;
}

/** 推進一個房間 */
async function tickRoom(room: RoomCode, bet: number, rev: number) {
  let r = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  const now = new Date();

  if (!r || r.phase === "SETTLED") {
    await openNewRound(room, bet, rev);
    return;
  }

  const ph = nextPhases(now, new Date(r.startedAt), bet, rev);

  // 進入開牌：發牌並寫結果
  if (ph.phase === "REVEALING" && r.phase === "BETTING") {
    // 用現有 shoe（或新產生）
    let shoe: number[];
    try {
      shoe = JSON.parse(r.shoeJson || "[]");
      if (!Array.isArray(shoe) || shoe.length < 6) shoe = initShoe();
    } catch {
      shoe = initShoe();
    }

    const dealt = dealRound(shoe);

    await prisma.round.update({
      where: { id: r.id },
      data: {
        phase: "REVEALING",
        resultJson: JSON.stringify(dealt),
        shoeJson: JSON.stringify(dealt.shoe),
        endsAt: new Date(r.startedAt.getTime() + (bet + rev) * 1000),
      },
    });

    r = await prisma.round.findUnique({ where: { id: r.id } });
  }

  // 進入結算
  if (ph.phase === "SETTLED" && r.phase !== "SETTLED") {
    // outcome 取自 resultJson（容錯）
    let outcome: any = null;
    try {
      const j = JSON.parse(r.resultJson || "null");
      outcome = j?.outcome ?? null;
    } catch {
      outcome = null;
    }

    await prisma.round.update({
      where: { id: r.id },
      data: { phase: "SETTLED", outcome, endedAt: new Date() },
    });

    // 下一局
    await openNewRound(room, bet, rev);
  }
}

async function main() {
  const { bet, rev } = await readSeconds();
  const rooms: RoomCode[] = ["R30", "R60", "R90"];

  for (const room of rooms) {
    await tickRoom(room, bet, rev);
  }

  console.log(`[auto-baccarat] tick done at ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
