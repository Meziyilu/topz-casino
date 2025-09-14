export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentState } from "@/services/baccarat.service";

export async function GET(){
  const rooms: ("R30"|"R60"|"R90")[] = ["R30","R60","R90"];
  const states = await Promise.all(rooms.map(r=>currentState(r)));
  const counts = await Promise.all(rooms.map(r=>prisma.baccaratRound.count({ where:{ room:r } })));
  return NextResponse.json({ rooms: states.map((s,i)=>({ ...s, totalRounds: counts[i] })) });
}
