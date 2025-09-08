// scripts/auto-baccarat.ts
import { PrismaClient, type RoomCode, type BetSide } from "@prisma/client";

const prisma = new PrismaClient();

/** 房間時間設定（跟前端/服務一致） */
const ROOMS: Record<RoomCode, { secondsPerRound: number }> = {
  R30: { secondsPerRound: 30 },
  R60: { secondsPerRound: 60 },
  R90: { secondsPerRound: 90 },
};

/** 結束後冷卻秒數（留 1 秒緩衝即可） */
const COOLDOWN_SECONDS = 1;

/** -------- 真實百家樂發牌（單副隨機）+ 第三張牌規則 -------- */
type Card = { r: number; p: number }; // r: 1..13, p: 點數（A=1, 2..9=2..9, 10/J/Q/K=0）
function drawCard(): Card {
  const r = 1 + Math.floor(Math.random() * 13);
  const p = r === 1 ? 1 : r >= 10 ? 0 : r;
  return { r, p };
}
function points(cards: Card[]): number {
  return cards.reduce((a, c) => a + c.p, 0) % 10;
}
function baccaratDeal() {
  const P: Card[] = [drawCard(), drawCard()];
  const B: Card[] = [drawCard(), drawCard()];
  let p = points(P);
  let b = points(B);

  // Natural 8/9
  if (p >= 8 || b >= 8) return { P, B, p, b };

  // 玩家第三張
  let p3: Card | null = null;
  if (p <= 5) {
    p3 = drawCard();
    P.push(p3);
    p = points(P);
  }

  // 莊家第三張（依玩家第三張）
  const bankerDraw = () => {
    const c = drawCard();
    B.push(c);
    b = points(B);
  };

  if (!p3) {
    if (b <= 5) bankerDraw();
  } else {
    const t = p3.p; // 玩家第三張點
    if (b <= 2) bankerDraw();
    else if (b === 3 && t !== 8) bankerDraw();
    else if (b === 4 && t >= 2 && t <= 7) bankerDraw();
    else if (b === 5 && t >= 4 && t <= 7) bankerDraw();
    else if (b === 6 && (t === 6 || t === 7)) bankerDraw();
  }

  return { P, B, p, b };
}
function outcomeFromPoints(p: number, b: number): "PLAYER" | "BANKER" | "TIE" {
  if (p === b) return "TIE";
  return p > b ? "PLAYER" : "BANKER";
}

/** 賠率（與前端標示對齊；對子/完美對目前先不派彩） */
const PAYOUT: Record<BetSide, number> = {
  PLAYER: 1,
  BANKER: 1,            // 遇到「莊 6」會改成 0.5（Super Six 規則）
  TIE: 8,
  PLAYER_PAIR: 0,       // 先不派彩（要做就要存前兩張牌 rank）
  BANKER_PAIR: 0,
  ANY_PAIR: 0,
  PERFECT_PAIR: 0,
  BANKER_SUPER_SIX: 12, // 成立條件：莊勝且 6 點
};

/** 派彩（含 BANKER 6 點半賠、BANKER_SUPER_SIX） */
async function settleRound(roundId: string, p: number, b: number) {
  const outcome = outcomeFromPoints(p, b);
  const superSix = outcome === "BANKER" && b === 6;

  const bets = await prisma.bet.findMany({ where: { roundId } });

  const perUser: Record<string, number> = {};
  for (const bet of bets) {
    let odds = PAYOUT[bet.side] ?? 0;

    // Super Six 主注半賠
    if (bet.side === "BANKER" && superSix) odds = 0.5;

    const betWins =
      (bet.side === "PLAYER" && outcome === "PLAYER") ||
      (bet.side === "BANKER" && outcome === "BANKER") ||
      (bet.side === "TIE" && outcome === "TIE") ||
      (bet.side === "BANKER_SUPER_SIX" && superSix);
      // 其他 Pair/Perfect/Any 目前先不派彩

    const prize = betWins ? Math.floor(bet.amount * odds) : 0;
    if (prize > 0) perUser[bet.userId] = (perUser[bet.userId] ?? 0) + prize;
  }

  await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: roundId },
      data: { outcome, phase: "SETTLED" },
    });

    // 發錢 + ledger
    for (const [userId, inc] of Object.entries(perUser)) {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: inc } },
      });
      await tx.ledger.create({
        data: { userId, type: "PAYOUT", target: "WALLET", amount: inc },
      });
    }
  });
}

/** 確保房間有一局在跑；時間到就結算；結束後自動開下一局 */
async function ensureRound(room: RoomCode) {
  const rc = ROOMS[room];
  const cur = await prisma.round.findFirst({
    where: { room },
    orderBy: { startedAt: "desc" },
  });

  if (!cur) {
    await prisma.round.create({
      data: { room, phase: "BETTING", startedAt: new Date(), outcome: null },
    });
    return;
  }

  if (cur.phase === "SETTLED") {
    const elapsed = (Date.now() - cur.startedAt.getTime()) / 1000;
    if (elapsed >= rc.secondsPerRound + COOLDOWN_SECONDS) {
      await prisma.round.create({
        data: { room, phase: "BETTING", startedAt: new Date(), outcome: null },
      });
    }
    return;
  }

  if (cur.phase === "BETTING") {
    const left = rc.secondsPerRound - Math.floor((Date.now() - cur.startedAt.getTime()) / 1000);
    if (left <= 0) {
      const deal = baccaratDeal();                // 真實規則發牌 → 得出 p/b
      await settleRound(cur.id, deal.p, deal.b);  // 結算 + 派彩
    }
    return;
  }

  // 若你之後加 REVEALING 流程，可在這裡補：REVEALING → N 秒 → SETTLED
}

/** 每秒巡檢全部房間 */
async function tickAllRooms() {
  for (const room of Object.keys(ROOMS) as RoomCode[]) {
    try {
      await ensureRound(room);
    } catch (e) {
      console.error(`[auto-baccarat] ${room} error:`, e);
    }
  }
}

async function main() {
  console.log("[auto-baccarat] worker started");
  setInterval(() => {
    tickAllRooms().catch((e) => console.error("tick loop error:", e));
  }, 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
