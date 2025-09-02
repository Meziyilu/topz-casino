export const runtime="nodejs"; export const revalidate=0; export const dynamic="force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") || "R60") as "R30"|"R60"|"R90";
  const limit = Math.min(500, Number(searchParams.get("limit")||"200"));
  const list = await prisma.sicboRound.findMany({
    where: { room }, orderBy: { startsAt:"desc" }, take: limit,
    select: { daySeq:true, die1:true, die2:true, die3:true, sum:true, isTriple:true, startsAt:true }
  });
  return NextResponse.json({ items: list });
}
