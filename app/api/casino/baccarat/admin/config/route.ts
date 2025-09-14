export const runtime = "nodejs"; export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(){
  const keys = await prisma.gameConfig.findMany({ where:{ gameCode:"BACCARAT" }, orderBy:[{ key:"asc" }]});
  return NextResponse.json({ items: keys });
}
export async function POST(req:Request){
  const { key, valueInt, valueString } = await req.json();
  const item = await prisma.gameConfig.upsert({
    where:{ gameCode_key:{ gameCode:"BACCARAT", key } },
    create:{ gameCode:"BACCARAT", key, valueInt, valueString },
    update:{ valueInt, valueString }
  });
  return NextResponse.json({ item });
}
