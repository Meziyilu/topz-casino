export const dynamic = "force-dynamic"; export const revalidate = 0;
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";


function noStore(init?: number){
return { status: init ?? 200, headers: {
"Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
Pragma:"no-cache", Expires:"0"
}} as any;
}


export async function GET(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const a = await prisma.friendship.findMany({ where: { userAId: token.sub }, include: { userB: true } });
const b = await prisma.friendship.findMany({ where: { userBId: token.sub }, include: { userA: true } });
const list = [ ...a.map(x=>x.userB), ...b.map(x=>x.userA) ];
return NextResponse.json({
count: list.length,
items: list.map(u=>({ id:u.id, nickname: u.nickname ?? u.name ?? u.email.split("@")[0], avatarUrl: u.avatarUrl ?? null }))
}, noStore());
}