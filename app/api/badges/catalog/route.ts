export const dynamic = "force-dynamic"; export const revalidate = 0;
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


function noStore(init?: number){
return { status: init ?? 200, headers: {
"Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
Pragma:"no-cache", Expires:"0"
}} as any;
}


const DEFAULTS = [
{ code:"FIRST_WIN", name:"初勝", rarity:1 },
{ code:"BIG_BANK", name:"資產百萬", rarity:3 },
{ code:"HOT_STREAK", name:"連勝之王", rarity:4 },
{ code:"LUCKY_TIE", name:"和氣生財", rarity:2 },
];


export async function GET(){
const all = await prisma.badge.findMany({ orderBy: { createdAt: "asc" } });
return NextResponse.json({ catalog: all, defaults: DEFAULTS }, noStore());
}