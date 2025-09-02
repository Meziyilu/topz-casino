export const runtime = "nodejs"; export const revalidate = 0; export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";
import { verifyRequest } from "@/lib/jwt";

type BetIn =
 | { kind:"BIG_SMALL"; bigSmall:"BIG"|"SMALL"; amount:number }
 | { kind:"TOTAL"; totalSum:number; amount:number }
 | { kind:"SINGLE_FACE"; face:number; amount:number }
 | { kind:"DOUBLE_FACE"; face:number; amount:number }
 | { kind:"ANY_TRIPLE"; amount:number }
 | { kind:"SPECIFIC_TRIPLE"; face:number; amount:number }
 | { kind:"TWO_DICE_COMBO"; faceA:number; faceB:number; amount:number };

function bad(msg:string, code=400){ return NextResponse.json({ error: msg }, { status: code }); }

export async function POST(req: Request){
  const auth = verifyRequest(req);
  if (!auth?.userId) return bad("UNAUTHORIZED", 401);

  const body = await req.json().catch(()=>null) as { room:"R30"|"R60"|"R90"; bets:BetIn[]; autoFollow?:number };
  const room = body?.room ?? "R60"; const bets = body?.bets ?? [];
  if (!Array.isArray(bets) || bets.length===0) return bad("NO_BETS");

  await ensureRooms();
  const s = getRoomState(room), cfg = getRoomConfig(room);
  if (!s || !cfg) return bad("ROOM_NOT_READY", 503);
  if (s.phase !== "BETTING") return bad("NOT_IN_BETTING", 409);

  const me = await prisma.user.findUnique({ where:{ id:auth.userId }, select:{ balance:true, id:true }});
  if (!me) return bad("USER_NOT_FOUND", 404);

  let total = 0;
  for (const b of bets) {
    if (b.amount < cfg.limits.minBet) return bad("UNDER_MIN");
    if (b.amount > cfg.limits.maxBet) return bad("OVER_MAX");
    total += b.amount;
  }
  if (total > cfg.limits.perRoundMax) return bad("OVER_ROUND_LIMIT");
  if (me.balance < total) return bad("INSUFFICIENT_BALANCE", 402);

  const tx = await prisma.$transaction(async (tx) => {
    await tx.ledger.create({ data: { type:"BET_PLACED", game:"SICBO", gameRef:s.roundId!, userId: me.id, amount: -total }});
    await tx.user.update({ where:{ id: me.id }, data:{ balance: { decrement: total }}});

    const toCreate = bets.map(b=>{
      const odds = (()=> {
        switch (b.kind) {
          case "BIG_SMALL": return cfg.payout.bigSmall[b.bigSmall];
          case "TOTAL": return cfg.payout.total[b.totalSum];
          case "SINGLE_FACE": return 1; // 1/2/3 倍由結算時判斷
          case "DOUBLE_FACE": return cfg.payout.doubleFace;
          case "ANY_TRIPLE": return cfg.payout.anyTriple;
          case "SPECIFIC_TRIPLE": return cfg.payout.specificTriple;
          case "TWO_DICE_COMBO": return cfg.payout.twoDiceCombo;
        }
      })();
      const base:any = { userId: me.id, roundId: s.roundId!, amount: b.amount, odds };
      if (b.kind==="BIG_SMALL") return { ...base, kind:"BIG_SMALL", bigSmall:b.bigSmall };
      if (b.kind==="TOTAL")     return { ...base, kind:"TOTAL", totalSum:b.totalSum };
      if (b.kind==="SINGLE_FACE") return { ...base, kind:"SINGLE_FACE", face:b.face };
      if (b.kind==="DOUBLE_FACE") return { ...base, kind:"DOUBLE_FACE", face:b.face };
      if (b.kind==="ANY_TRIPLE") return { ...base, kind:"ANY_TRIPLE" };
      if (b.kind==="SPECIFIC_TRIPLE") return { ...base, kind:"SPECIFIC_TRIPLE", face:b.face };
      if (b.kind==="TWO_DICE_COMBO") return { ...base, kind:"TWO_DICE_COMBO", faceA:Math.min(b.faceA,b.faceB), faceB:Math.max(b.faceA,b.faceB) };
      return base;
    });

    const created = await tx.sicboBet.createMany({ data: toCreate });
    return { createdCount: created.count };
  });

  return NextResponse.json({ ok: true, ...tx });
}
