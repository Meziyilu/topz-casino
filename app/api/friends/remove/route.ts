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


export async function POST(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const { userId } = await req.json();
if (!userId || userId === token.sub) return NextResponse.json({ error: "BadTarget" }, { status: 400 });


const [a,b] = [token.sub, String(userId)];
const [A,B] = a < b ? [a,b] : [b,a];
const fr = await prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: A, userBId: B } }, select: { id: true } });
if (fr) await prisma.friendship.delete({ where: { id: fr.id } });


return NextResponse.json({ ok: true }, noStore());
}