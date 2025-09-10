export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room")||"R60") as "R30"|"R60"|"R90";
  const items = await prisma.sicboRound.findMany({
    where:{ room },
    orderBy:{ startsAt:"desc" },
    take:50,
    select:{ daySeq:true, die1:true, die2:true, die3:true, sum:true, isTriple:true }
  });
  return NextResponse.json({ items });
}
