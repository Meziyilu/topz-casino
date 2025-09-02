export const dynamic = "force-dynamic"; export const revalidate = 0;
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { LedgerType, BetSide, RoundOutcome } from "@prisma/client";


function d(s?: string|null){ if(!s) return undefined; const x = new Date(s); return isNaN(x.getTime())? undefined : x; }
function noStore(init?: number){
return { status: init ?? 200, headers: {
"Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
Pragma:"no-cache", Expires:"0"
}} as any;
}


export async function GET(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const url = new URL(req.url); const since = d(url.searchParams.get("since")); const until = d(url.searchParams.get("until"));
const whereTime = { gte: since ?? undefined, lte: until ?? undefined };


const [betAgg, payoutAgg] = await Promise.all([
prisma.ledger.aggregate({ _sum: { delta: true }, where: { userId: token.sub, type: LedgerType.BET_PLACED, createdAt: whereTime } }),
prisma.ledger.aggregate({ _sum: { delta: true }, where: { userId: token.sub, type: LedgerType.PAYOUT, createdAt: whereTime } }),
]);
const bet = betAgg._sum.delta ?? 0; const payout = payoutAgg._sum.delta ?? 0;
const turnover = Math.abs(bet); const netProfit = payout + bet;


// 百家樂勝率（Pair 算獨立贏次）
const bets = await prisma.bet.findMany({ where: { userId: token.sub, createdAt: whereTime }, include: { round: { select: { outcome: true, playerPair: true, bankerPair: true } } } });
let win = 0; for (const b of bets) {
const oc = b.round?.outcome; if (!oc) continue;
if ((b.side === BetSide.PLAYER && oc === RoundOutcome.PLAYER) || (b.side === BetSide.BANKER && oc === RoundOutcome.BANKER) || (b.side === BetSide.TIE && oc === RoundOutcome.TIE)) win++;
if ((b.side === BetSide.PLAYER_PAIR && b.round?.playerPair) || (b.side === BetSide.BANKER_PAIR && b.round?.bankerPair)) win++;
}
const winRate = bets.length ? Math.round((win / bets.length) * 1000)/10 : 0;


// 每日盈虧/流水（Ledger 聚合）
const daysMap = new Map<string, { bet:number; payout:number }>();
const daily = await prisma.ledger.findMany({ where: { userId: token.sub, type: { in: [LedgerType.BET_PLACED, LedgerType.PAYOUT] }, createdAt: whereTime }, select: { createdAt:true, delta:true, type:true }});
for (const r of daily){
const k = r.createdAt.toISOString().slice(0,10);
const o = daysMap.get(k) ?? { bet:0, payout:0 };
if (r.type===LedgerType.BET_PLACED) o.bet += (r.delta??0); else o.payout += (r.delta??0);
daysMap.set(k,o);
}
const dailyOut = Array.from(daysMap.entries()).sort(([a],[b])=> a.localeCompare(b)).map(([date,o])=> ({ date, turnover: Math.abs(o.bet), profit: o.payout + o.bet }));


return NextResponse.json({ turnover, payout, netProfit, winRate, daily: dailyOut }, noStore());
}