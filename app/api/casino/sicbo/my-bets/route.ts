export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;
import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma";

export async function GET(req:Request){
  const auth = verifyRequest(req);
  if (!auth?.userId) return NextResponse.json({ error:"UNAUTHORIZED" },{status:401});
  const items = await prisma.sicboBet.findMany({
    where:{ userId:auth.userId },
    orderBy:{ placedAt:"desc" },
    take:50
  });
  return NextResponse.json({ items });
}
