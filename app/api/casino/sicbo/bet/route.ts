export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;

import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";
import { SicboRoomKey } from "@/services/sicbo.service";
import { ensureRooms, getRoomConfig, getRoomState } from "@/lib/sicbo/room";
import prisma from "@/lib/prisma";

export async function POST(req:Request){
  const auth = verifyRequest(req);
  if (!auth?.userId) return NextResponse.json({ error:"UNAUTHORIZED" },{status:401});
  const { room="R60", bets=[] } = await req.json();
  await ensureRooms();
  const s = getRoomState(room as SicboRoomKey);
  const cfg = getRoomConfig(room as SicboRoomKey);
  if (!s || !cfg) return NextResponse.json({ error:"ROOM_NOT_READY" },{status:503});
  if (s.phase!=="BETTING") return NextResponse.json({ error:"NOT_IN_BETTING" },{status:409});
  const me = await prisma.user.findUnique({ where:{ id:auth.userId }, select:{ balance:true }});
  if (!me) return NextResponse.json({ error:"USER_NOT_FOUND" },{status:404});

  let total=0;
  for(const b of bets){ total+=b.amount; }
  if (me.balance<total) return NextResponse.json({ error:"INSUFFICIENT" },{status:402});

  const tx = await prisma.$transaction(async(tx)=>{
    await tx.ledger.create({ data:{ type:"BET_PLACED", game:"SICBO", gameRef:s.roundId!, userId:auth.userId, amount:-total }});
    await tx.user.update({ where:{ id:auth.userId }, data:{ balance:{ decrement:total }}});
    await tx.sicboBet.createMany({ data:bets.map((b:any)=>({ userId:auth.userId, roundId:s.roundId!, ...b, odds:1 }))});
    return { created:bets.length };
  });
  return NextResponse.json({ ok:true, ...tx });
}
