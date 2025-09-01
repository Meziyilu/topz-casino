export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function readToken(req: Request){
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").map(s=>s.trim()).find(s=>s.startsWith("token="))?.slice(6) ?? "";
}

export async function GET(req: Request) {
  const p = verifyJWT<{ uid:string }>(readToken(req));
  if (!p?.uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const current = await prisma.lottoRound.findFirst({ orderBy:{ code:"desc" }, select:{ id:true, code:true } });
  const recent = await prisma.lottoBet.findMany({
    where: { userId: p.uid },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id:true, roundId:true, amount:true, status:true, payout:true, kind:true,
      picksKey:true, ballIndex:true, attr:true,
      round:{ select:{ code:true, drawAt:true, status:true } }
    }
  });

  return NextResponse.json({ currentRoundId: current?.id ?? null, items: recent });
}
