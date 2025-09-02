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


export async function POST(req: Request, { params }: { params: { id: string } }){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { body } = await req.json();
if (!body || String(body).length < 1) return NextResponse.json({ error: "BodyRequired" }, { status: 400 });
const c = await prisma.wallComment.create({ data: { postId: params.id, userId: token.sub, body: String(body).slice(0,500) } });
return NextResponse.json({ ok: true, id: c.id }, noStore());
}