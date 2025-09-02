export const runtime="nodejs"; export const revalidate=0; export const dynamic="force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

export async function GET(req: Request){
  const auth = verifyRequest(req);
  if (!auth?.userId) return NextResponse.json({ error:"UNAUTHORIZED" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Number(searchParams.get("limit")||"50"));
  const items = await prisma.sicboBet.findMany({
    where: { userId: auth.userId },
    orderBy:[{ placedAt: "desc" }],
    take: limit
  });
  return NextResponse.json({ items });
}
