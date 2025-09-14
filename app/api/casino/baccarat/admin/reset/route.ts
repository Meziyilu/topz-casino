export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req:Request){
  const { room } = await req.json() as { room:"R30"|"R60"|"R90" };
  // 將當前局強制 SETTLED，下一次拉 state 會自動開新局
  const cur = await prisma.baccaratRound.findFirst({ where:{ room }, orderBy:[{ createdAt:"desc" }]});
  if (cur) await prisma.baccaratRound.update({ where:{ id:cur.id }, data:{ phase:"SETTLED" }});
  return NextResponse.json({ ok:true });
}
