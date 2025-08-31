import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Period = 'today' | 'week';

const TAIPEI_OFFSET_HOURS = 8;

// 賠率（總返還倍率；含本金）
function cfg() {
  const noComm = (process.env.TOPZ_BANKER_NO_COMMISSION || 'false').toLowerCase() === 'true';
  const tieOdds = Number(process.env.TOPZ_TIE_ODDS || 8);    // 8 or 9
  const pairOdds = Number(process.env.TOPZ_PAIR_ODDS || 11); // 通常 11

  return {
    PLAYER_RETURN: 2,                        // 1:1
    BANKER_RETURN: noComm ? 2 : 1.95,        // 無佣 2x；有佣 1.95x
    TIE_RETURN: 1 + tieOdds,                 // 8:1 -> 9x
    PAIR_RETURN: 1 + pairOdds,               // 11:1 -> 12x
  };
}

function toUTC(d: Date) {
  return new Date(d.getTime() - TAIPEI_OFFSET_HOURS * 3600 * 1000);
}
function startOfTodayTaipei(now = new Date()) {
  const t = new Date(now.getTime() + TAIPEI_OFFSET_HOURS * 3600 * 1000);
  const startLocalMidnight = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0));
  return toUTC(startLocalMidnight);
}
function startOfWeekTaipei(now = new Date()) {
  const t = new Date(now.getTime() + TAIPEI_OFFSET_HOURS * 3600 * 1000);
  const day = t.getUTCDay() || 7; // 週日=0 改 7
  const diffDays = day - 1;
  const monday = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - diffDays, 0, 0, 0));
  return toUTC(monday);
}
function resolveWindow(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === 'week') return { start: startOfWeekTaipei(now), end: now, label: '本週' };
  return { start: startOfTodayTaipei(now), end: now, label: '本日' };
}

function isRoomCode(x: string) {
  return x === 'R30' || x === 'R60' || x === 'R90';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') || 'today') as Period;
    const roomParam = (searchParams.get('room') || 'all').toUpperCase();
    let limit = parseInt(searchParams.get('limit') || '10', 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 10;
    if (limit > 100) limit = 100;

    const { start, end, label } = resolveWindow(period);
    const { PLAYER_RETURN, BANKER_RETURN, TIE_RETURN, PAIR_RETURN } = cfg();

    // 以 $queryRaw 做彙總（依你的 Prisma 表名/列名）
    // - 期間：Round.settledAt 在 [start, end)
    // - 房間：Room.code = roomParam（若非 ALL）
    // - payout 計算為「總返還（含本金）」；banker 帶抽水，向下取整
    // - push（和局時押閒/莊）總返還 = 1x
    const rows = await prisma.$queryRaw<
      Array<{ userId: string; wagered: bigint; payout: bigint; }>
    >`
      SELECT
        b."userId" as "userId",
        SUM(b."amount")::bigint AS "wagered",
        SUM(
          CASE
            WHEN b."side" = 'PLAYER'::"BetSide" AND r."outcome" = 'PLAYER'::"RoundOutcome"
              THEN (b."amount" * ${PLAYER_RETURN})::int
            WHEN b."side" = 'BANKER'::"BetSide" AND r."outcome" = 'BANKER'::"RoundOutcome"
              THEN FLOOR(b."amount" * ${BANKER_RETURN})::int
            WHEN b."side" = 'TIE'::"BetSide" AND r."outcome" = 'TIE'::"RoundOutcome"
              THEN (b."amount" * ${TIE_RETURN})::int
            WHEN r."outcome" = 'TIE'::"RoundOutcome" AND (b."side" = 'PLAYER'::"BetSide" OR b."side" = 'BANKER'::"BetSide")
              THEN b."amount"
            WHEN b."side" = 'PLAYER_PAIR'::"BetSide" AND r."playerPair" = TRUE
              THEN (b."amount" * ${PAIR_RETURN})::int
            WHEN b."side" = 'BANKER_PAIR'::"BetSide" AND r."bankerPair" = TRUE
              THEN (b."amount" * ${PAIR_RETURN})::int
            ELSE 0
          END
        )::bigint AS "payout"
      FROM "Bet" b
      JOIN "Round" r ON r."id" = b."roundId"
      JOIN "Room" rm ON rm."id" = b."roomId"
      WHERE
        r."settledAt" IS NOT NULL
        AND r."settledAt" >= ${start}
        AND r."settledAt" < ${end}
        AND (${roomParam} = 'ALL' OR rm."code" = ${roomParam}::"RoomCode")
      GROUP BY b."userId"
    `;

    // 取用戶顯示名
    const userIds = rows.map(r => r.userId);
    const users = userIds.length ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }) : [];
    const mapUser = new Map(users.map(u => [u.id, u]));

    const items = rows.map(r => {
      const wagered = Number(r.wagered || 0);
      const payout = Number(r.payout || 0);
      const profit = payout - wagered;
      const u = mapUser.get(r.userId);
      const displayName = u?.name || (u?.email ? u.email.split('@')[0] : r.userId.slice(0, 6));
      return { userId: r.userId, name: displayName, wagered, payout, profit };
    }).sort((a, b) => b.profit - a.profit).slice(0, limit);

    return NextResponse.json({
      period: { key: period, label, startISO: start.toISOString(), endISO: end.toISOString(), tz: 'Asia/Taipei' },
      room: roomParam,
      limit,
      items,
      rules: {
        bankerNoCommission: (process.env.TOPZ_BANKER_NO_COMMISSION || 'false').toLowerCase() === 'true',
        tieOdds: Number(process.env.TOPZ_TIE_ODDS || 8),
        pairOdds: Number(process.env.TOPZ_PAIR_ODDS || 11),
      }
    });
  } catch (err: any) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
