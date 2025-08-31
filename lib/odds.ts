import { $Enums } from '@prisma/client';

export type Returns = {
  PLAYER_RETURN: number;  // 含本金
  BANKER_RETURN: number;  // 含本金（有佣=1.95 / 無佣=2）
  TIE_RETURN: number;     // 含本金（如 9:1 -> 10）
  PAIR_RETURN: number;    // 含本金（如 11:1 -> 12）
  bankerNoCommission: boolean;
  tieOdds: number;
  pairOdds: number;
};

export function getReturns(): Returns {
  const bankerNoCommission =
    (process.env.TOPZ_BANKER_NO_COMMISSION || 'false').toLowerCase() === 'true';
  const tieOdds = Number(process.env.TOPZ_TIE_ODDS || 8);
  const pairOdds = Number(process.env.TOPZ_PAIR_ODDS || 11);
  return {
    PLAYER_RETURN: 2,
    BANKER_RETURN: bankerNoCommission ? 2 : 1.95,
    TIE_RETURN: 1 + tieOdds,
    PAIR_RETURN: 1 + pairOdds,
    bankerNoCommission,
    tieOdds,
    pairOdds,
  };
}

/** 單注派彩（含本金）；輸=0；和局推注(押閒/莊遇和)退本金(1x) */
export function computePayout(
  side: $Enums.BetSide,
  outcome: $Enums.RoundOutcome | null,
  flags: { playerPair?: boolean | null; bankerPair?: boolean | null },
  amount: number
): number {
  const { PLAYER_RETURN, BANKER_RETURN, TIE_RETURN, PAIR_RETURN } = getReturns();

  if (side === 'PLAYER' && outcome === 'PLAYER') return Math.round(amount * PLAYER_RETURN);
  if (side === 'BANKER' && outcome === 'BANKER') return Math.floor(amount * BANKER_RETURN);
  if (side === 'TIE'    && outcome === 'TIE')    return Math.round(amount * TIE_RETURN);

  // 和局推注：押閒/押莊遇到 outcome=TIE → 退本金
  if ((side === 'PLAYER' || side === 'BANKER') && outcome === 'TIE') return amount;

  if (side === 'PLAYER_PAIR' && flags.playerPair) return Math.round(amount * PAIR_RETURN);
  if (side === 'BANKER_PAIR' && flags.bankerPair) return Math.round(amount * PAIR_RETURN);

  return 0;
}
