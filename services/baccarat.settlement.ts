// services/baccarat.settlement.ts
// 以「下注已先扣錢」為前提：結算時要把「本金 + 盈利」一併加回去。
// 主注規則：
// - PLAYER 勝：Player 注賠率 1:1 → 加回 (1+1)*amount = 2x
// - BANKER 勝：一般 1:1；若「莊6獲勝(super6)」→ 半賠 → (1+0.5)=1.5x
// - TIE：Tie 1:8 → 9x；同時 Player/Banker 注「和局退回本金 1x」
// Side 注：PLAYER_PAIR 1:11，BANKER_PAIR 1:11，ANY_PAIR 1:5，PERFECT_PAIR 1:25，BANKER_SUPER_SIX 1:12

import { prisma } from '@/lib/prisma';
import type { BetSide } from '@prisma/client';
import type { RoundDetail } from './baccarat.engine';

type PayoutOdds = Record<BetSide, number>; // 淨利（to-1）的倍數

export function computePayoutPerBet(
  side: BetSide,
  amount: number,
  detail: RoundDetail,
  odds: PayoutOdds
) {
  const { outcome, flags } = detail;

  const win = (() => {
    switch (side) {
      case 'PLAYER': return outcome === 'PLAYER';
      case 'BANKER': return outcome === 'BANKER';
      case 'TIE':    return outcome === 'TIE';
      case 'PLAYER_PAIR':  return flags.playerPair;
      case 'BANKER_PAIR':  return flags.bankerPair;
      case 'ANY_PAIR':     return flags.anyPair;
      case 'PERFECT_PAIR': return flags.perfectPair;
      case 'BANKER_SUPER_SIX': return flags.super6;
      default: return false;
    }
  })();

  // 主注 push：和局時，壓 PLAYER/BANKER 退本金
  const push = (outcome === 'TIE') && (side === 'PLAYER' || side === 'BANKER');

  if (push) return amount; // 退 1x 本金

  if (win) {
    let o = odds[side] ?? 0;
    // 莊6半賠：只有 BANKER 主注，需要把 1 → 0.5
    if (side === 'BANKER' && flags.super6) o = 0.5;
    // 返還本金 + 淨利
    return Math.floor(amount * (1 + o));
  }
  return 0;
}

export async function settleRoundWithDetail(roundId: string, detail: RoundDetail) {
  // 取出所有下注
  const bets = await prisma.bet.findMany({ where: { roundId } });

  const odds: PayoutOdds = {
    PLAYER: 1, BANKER: 1, TIE: 8,
    PLAYER_PAIR: 11, BANKER_PAIR: 11, ANY_PAIR: 5, PERFECT_PAIR: 25,
    BANKER_SUPER_SIX: 12,
  };

  // 聚合每人應入帳金額（本金+盈利）
  const userCredit: Record<string, number> = {};
  for (const b of bets) {
    const credit = computePayoutPerBet(b.side as BetSide, b.amount, detail, odds);
    if (credit > 0) {
      userCredit[b.userId] = (userCredit[b.userId] ?? 0) + credit;
    }
  }

  // 寫入回合結果（保存點數/牌面/各旗標），派彩入帳
  await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: roundId },
      data: {
        outcome: detail.outcome,
        phase: 'SETTLED',
        // 你若 Round 有 JSON 欄位可直接存（若沒有，可做一個 RoundDetail 表；這裡示範 JSON 寫入）
        cardsPlayer: detail.player as any,
        cardsBanker: detail.banker as any,
        pointP: detail.p,
        pointB: detail.b,
        super6: detail.flags.super6,
        playerPair: detail.flags.playerPair,
        bankerPair: detail.flags.bankerPair,
        perfectPair: detail.flags.perfectPair,
        anyPair: detail.flags.anyPair,
      } as any,
    });

    for (const [uid, inc] of Object.entries(userCredit)) {
      await tx.user.update({ where: { id: uid }, data: { balance: { increment: inc } } });
      await tx.ledger.create({
        data: { userId: uid, type: 'PAYOUT', target: 'WALLET', amount: inc },
      });
    }
  });

  return { creditedUsers: Object.keys(userCredit).length };
}
