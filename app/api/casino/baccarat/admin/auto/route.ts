import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BetSide, LedgerType, RoomCode, RoundPhase } from "@prisma/client";

export const dynamic = "force-dynamic";

// 你可以放到 .env
const ROOMS: RoomCode[] = ["R30","R60","R90"];
const SECONDS_PER_ROUND: Record<RoomCode, number> = { R30:30, R60:60, R90:90 };
const REVEAL_SECONDS = 2;

// Very basic odds（你可改）
const ODDS: Record<BetSide, number> = {
  PLAYER: 1, BANKER: 1, TIE: 8,
  PLAYER_PAIR: 11, BANKER_PAIR: 11, ANY_PAIR: 5, PERFECT_PAIR: 25, BANKER_SUPER_SIX: 12,
};

function requireCronKey(req: NextRequest) {
  const h = req.headers.get("x-cron-key");
  if (!h || h !== (process.env.CRON_SECRET || "dev_secret")) {
    throw new Error("UNAUTHORIZED_CRON");
  }
}

export async function POST(req: NextRequest) {
  try {
    requireCronKey(req);

    const now = new Date();

    for (const room of ROOMS) {
      // 取最近一局
      const cur = await prisma.round.findFirst({
        where: { room },
        orderBy: { startedAt: "desc" },
      });

      // 沒局 → 開一局
      if (!cur) {
        await prisma.round.create({
          data: { room, phase: "BETTING", startedAt: now },
        });
        continue;
      }

      // BETTING 期→檢查是否到期
      if (cur.phase === "BETTING") {
        const endsAt = new Date(cur.startedAt.getTime() + SECONDS_PER_ROUND[room] * 1000);
        if (now >= endsAt) {
          // 進入 REVEALING
          await prisma.round.update({
            where: { id: cur.id },
            data: { phase: "REVEALING", endedAt: now },
          });
        }
        continue;
      }

      // REVEALING 期→等 REVEAL_SECONDS 再結算
      if (cur.phase === "REVEALING") {
        const revealDoneAt = new Date((cur.endedAt ?? now).getTime() + REVEAL_SECONDS * 1000);
        if (now >= revealDoneAt) {
          // 產出「簡化」結果（真的要 3rd 牌規則可再搬你那份 dealBaccarat）
          const outcome: "PLAYER"|"BANKER"|"TIE" = Math.random()<0.46 ? "PLAYER" : (Math.random()<0.54 ? "BANKER" : "TIE");

          // 結算所有 bet
          const bets = await prisma.bet.findMany({ where:{ roundId: cur.id } });
          const userPayout: Record<string, number> = {};
          for (const b of bets) {
            let win = false;
            if ((b.side === "PLAYER" && outcome==="PLAYER") ||
                (b.side === "BANKER" && outcome==="BANKER") ||
                (b.side === "TIE"    && outcome==="TIE")) {
              win = true;
            }
            // 其它副注你若要真規則，這裡補判斷；先給 0
            const prize = win ? Math.floor(b.amount * (ODDS[b.side] ?? 0)) : 0;
            if (prize>0) userPayout[b.userId] = (userPayout[b.userId] ?? 0) + prize;
          }

          await prisma.$transaction(async (tx) => {
            await tx.round.update({
              where: { id: cur.id },
              data: { phase: "SETTLED", outcome },
            });
            for (const [uid, inc] of Object.entries(userPayout)) {
              await tx.user.update({ where:{ id: uid }, data:{ balance: { increment: inc } } });
              await tx.ledger.create({
                data: { userId: uid, type: "PAYOUT" satisfies LedgerType, target: "WALLET", amount: inc },
              });
            }
          });

          // 自動再開下一局
          await prisma.round.create({
            data: { room, phase: "BETTING", startedAt: new Date() },
          });
        }
        continue;
      }

      // SETTLED → 若超過 1 秒還沒新局，補一局
      if (cur.phase === "SETTLED") {
        const since = (cur.endedAt ?? cur.startedAt).getTime();
        if (now.getTime() - since > 1000) {
          await prisma.round.create({
            data: { room, phase: "BETTING", startedAt: now },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || "SERVER_ERROR" }, { status: 500 });
  }
}
