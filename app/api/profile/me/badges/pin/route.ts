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


const MAX_PIN = 3;


export async function POST(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const { badgeCode, pinned } = await req.json();
const b = await prisma.badge.findUnique({ where: { code: badgeCode } });
if(!b) return NextResponse.json({ error: "BadgeNotFound" }, { status: 404 });


await prisma.$transaction(async (tx)=>{
await tx.userBadge.upsert({
where: { userId_badgeId: { userId: token.sub, badgeId: b.id } },
update: { pinned: !!pinned },
create: { userId: token.sub, badgeId: b.id, pinned: !!pinned }
});
if (pinned) {
const pins = await tx.userBadge.count({ where: { userId: token.sub, pinned: true } });
if (pins > MAX_PIN) throw new Error("PIN_LIMIT");
}
});


return NextResponse.json({ ok: true }, noStore());
}