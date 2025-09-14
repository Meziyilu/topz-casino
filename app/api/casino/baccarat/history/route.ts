export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req:Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") ?? "R30") as any;
  const list = await prisma.baccaratRound.findMany({
    where:{ room, resultJson:{ not:null }}, orderBy:[{ createdAt:"desc" }], take:50
  });
  const items = list.map(x=>({ id:x.id, seq:x.seq, createdAt:x.createdAt, result: JSON.parse(x.resultJson!) }));
  return NextResponse.json({ items });
}
