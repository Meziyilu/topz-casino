import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { BetSide, RoomCode } from "@prisma/client";
import { getOptionalUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Q = z.object({
  room: z.string().transform(s => s.toUpperCase()).pipe(z.enum(["R30","R60","R90"] as const)),
});

function rng(seedStr: string) { let h=2166136261>>>0; for (let i=0;i<seedStr.length;i++){h^=seedStr.charCodeAt(i);h=Math.imul(h,16777619)} return ()=>{h+=0x6D2B79F5;let t=Math.imul(h^(h>>>15),1|h);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296}; }
type C={ r:number; s:number }; const draw=(r:()=>number):C=>({r:Math.floor(r()*13)+1,s:Math.floor(r()*4)}); const pval=(r:number)=>(r>=10?0:r===1?1:r);
function deal(seed:string){const rnd=rng(seed);const P=[draw(rnd),draw(rnd)],B=[draw(rnd),draw(rnd)];const p2=(pval(P[0].r)+pval(P[1].r))%10;const b2=(pval(B[0].r)+pval(B[1].r))%10;let p3:C|undefined,b3:C|undefined;if(p2<=5)p3=draw(rnd);const pPts=(p2+(p3?pval(p3.r):0))%10;if(!p3){if(b2<=5)b3=draw(rnd)}else{if(b2<=2)b3=draw(rnd);else if(b2<=6)b3=draw(rnd)}const bPts=(b2+(b3?pval(b3.r):0))%10;const outcome=pPts===bPts?"TIE":pPts>bPts?"PLAYER":"BANKER";return { outcome: outcome as "PLAYER"|"BANKER"|"TIE", pPts, bPts, cards:{player:[P[0],P[1],p3].filter(Boolean) as C[], banker:[B[0],B[1],b3].filter(Boolean) as C[]} };}

function todayRangeTZ8(){const now=new Date();const y=now.getUTCFullYear(),m=now.getUTCMonth(),d=now.getUTCDate();const start=new Date(Date.UTC(y,m,d,-8,0,0));const end=new Date(start.getTime()+24*60*60*1000);return {start,end};}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = Q.safeParse({ room: searchParams.get("room") ?? "" });
    if (!parsed.success) return NextResponse.json({ ok:false, error:"BAD_ROOM" }, { status:400 });
    const room = parsed.data.room as RoomCode;

    const userId = await getOptionalUserId(req);

    const cur = await prisma.round.findFirst({
      where: { room },
      orderBy: { startedAt: "desc" },
      select: { id: true, phase: true, outcome: true, startedAt: true },
    });

    // 倒數（簡單：30/60/90 依房間名）
    const secondsPerRound = room === "R30" ? 30 : room === "R90" ? 90 : 60;
    let secLeft = 0;
    if (cur?.phase === "BETTING" && cur.startedAt) {
      const endsAt = new Date(cur.startedAt.getTime() + secondsPerRound*1000);
      secLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now())/1000));
    }

    // 局序（不改 schema）
    const { start, end } = todayRangeTZ8();
    const countToday = await prisma.round.count({
      where: { room, startedAt: { gte: start, lt: end } },
    });
    const roundSeq = countToday > 0 ? countToday : 0;

    // 我的錢包
    let balance: number | null = null;
    if (userId) {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      balance = me?.balance ?? 0;
    }

    // 我的本局下注（彙總）
    const myAgg: Partial<Record<BetSide, number>> = {};
    if (userId && cur?.id) {
      const rows = await prisma.bet.groupBy({
        by: ["side"],
        where: { userId, roundId: cur.id },
        _sum: { amount: true },
      });
      rows.forEach(r => { myAgg[r.side as BetSide] = r._sum.amount ?? 0; });
    }

    // 本局視覺資料（REVEALING/SETTLED 才帶牌）
    let cards: { player:{rank:number;suit:number}[], banker:{rank:number;suit:number}[] }|undefined;
    let result: { outcome: "PLAYER"|"BANKER"|"TIE"; p:number; b:number }|null = null;
    if (cur?.id && (cur.phase === "REVEALING" || cur.phase === "SETTLED")) {
      const sim = deal(cur.id);
      cards = {
        player: sim.cards.player.map(c => ({ rank: c.r, suit: c.s })),
        banker: sim.cards.banker.map(c => ({ rank: c.r, suit: c.s })),
      };
      if (cur.phase === "SETTLED") result = { outcome: sim.outcome, p: sim.pPts, b: sim.bPts };
    }

    // 近 10 局（純視覺）
    const recentRows = await prisma.round.findMany({
      where: { room },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { id: true, outcome: true },
    });
    const recent = recentRows.map((r, i) => {
      const s = deal(r.id);
      return { roundSeq: 0, outcome: (r.outcome ?? s.outcome) as "PLAYER"|"BANKER"|"TIE", p: s.pPts, b: s.bPts };
    });

    return NextResponse.json({
      ok: true,
      room: { code: room, name: room, durationSeconds: secondsPerRound },
      day: new Date().toISOString().slice(0,10),
      roundId: cur?.id ?? null,
      roundSeq,
      phase: (cur?.phase ?? "BETTING") as "BETTING"|"REVEALING"|"SETTLED",
      secLeft,
      result,
      cards,
      myBets: myAgg,
      balance,
      recent,
    });
  } catch (e) {
    console.error("[state]", e);
    return NextResponse.json({ ok:false, error:"SERVER_ERROR" }, { status:500 });
  }
}
