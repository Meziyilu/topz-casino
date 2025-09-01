export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const sinceCode = searchParams.get("sinceCode");

  const where:any = {};
  if (sinceCode) where.code = { lt: Number(sinceCode) };

  const rows = await prisma.lottoRound.findMany({
    where, take: limit, orderBy: { code: "desc" },
    select: { code:true, drawAt:true, numbers:true, special:true, jackpot:true, pool:true, status:true }
  });
  return NextResponse.json({ items: rows });
}
