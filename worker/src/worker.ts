import { PrismaClient, BetSide, RoomCode } from "@prisma/client";
const prisma = new PrismaClient();

const ROOMS: { code: RoomCode; seconds: number }[] = [
  { code: "R30", seconds: 30 },
  { code: "R60", seconds: 60 },
  { code: "R90", seconds: 90 },
];
const REVEAL_BUFFER_MS = 2000;
const TICK_MS = 1000;

const PAYOUT: Record<BetSide, number> = {
  PLAYER: 1, BANKER: 1, TIE: 8,
  PLAYER_PAIR: 0, BANKER_PAIR: 0, ANY_PAIR: 0, PERFECT_PAIR: 0, BANKER_SUPER_SIX: 0,
};

async function loop() {
  const now = new Date();

  for (const { code, seconds } of ROOMS) {
    const cur = await prisma.round.findFirst({
      where: { room: code },
      orderBy: { startedAt: "desc" },
    });

    // 沒有 → 開局
    if (!cur) {
      await openRound(code);
      continue;
    }

    if (cur.phase === "BETTING") {
      const end = new Date(cur.startedAt.getTime() + seconds * 1000);
      if (now >= end) {
        await prisma.round.update({ where: { id: cur.id }, data: { phase: "REVEALING", endedAt: new Date() } });
      }
      continue;
    }

    if (cur.phase === "REVEALING") {
      if (!cur.endedAt || now.getTime() - cur.endedAt.getTime() >= REVEAL_BUFFER_MS) {
        await settleRound(cur.id);
        await openRound(code);
      }
      continue;
    }

    if (cur.phase === "SETTLED") {
      await openRound(code);
      continue;
    }
  }
}

async function openRound(room: RoomCode) {
  await prisma.round.create({
    data: { room, phase: "BETTING", startedAt: new Date() },
  });
}

async function settleRound(roundId: string) {
  // TODO：把你的「真實發牌邏輯」算出的 outcome 帶進來
  const outcome: "PLAYER" | "BANKER" | "TIE" = "PLAYER";

  const bets = await prisma.bet.findMany({ where: { roundId } });
  const userPayout: Record<string, number> = {};
  for (const b of bets) {
    const odds = PAYOUT[b.side] ?? 0;
    const win =
      (outcome === "PLAYER" && b.side === "PLAYER") ||
      (outcome === "BANKER" && b.side === "BANKER") ||
      (outcome === "TIE" && b.side === "TIE");
    const prize = win ? Math.floor(b.amount * odds) : 0;
    if (prize > 0) userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
  }

  await prisma.$transaction(async (tx) => {
    await tx.round.update({ where: { id: roundId }, data: { phase: "SETTLED", outcome, endedAt: new Date() } });
    for (const [uid, inc] of Object.entries(userPayout)) {
      await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
      await tx.ledger.create({ data: { userId: uid, type: "PAYOUT", target: "WALLET", amount: inc } });
    }
  });
}

// 主循環
setInterval(loop, TICK_MS);
// Render worker 需要保持進程
console.log("Baccarat worker started");
