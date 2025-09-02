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
const url = new URL(req.url);
const userId = url.searchParams.get("userId");
const cursor = url.searchParams.get("cursor");
const take = Math.min(50, Number(url.searchParams.get("take") ?? 20));


const where = { hidden: false, ...(userId? { userId } : {}) } as any;
const items = await prisma.wallPost.findMany({
where,
orderBy: { createdAt: "desc" },
take,
...(cursor? { skip:1, cursor: { id: cursor } } : {}),
include: {
user: true,
likes: true,
comments: { take: 3, orderBy: { createdAt: "desc" }, include: { user: true } }
}
});
const nextCursor = items.length === take ? items[items.length-1].id : null;
return NextResponse.json({ items, nextCursor }, noStore());
}


export async function POST(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { body, imageUrl } = await req.json();
if (!body || String(body).length < 1) return NextResponse.json({ error: "BodyRequired" }, { status: 400 });
const p = await prisma.wallPost.create({ data: { userId: token.sub, body: String(body).slice(0, 1000), imageUrl: imageUrl?.slice(0,512) } });
return NextResponse.json({ ok: true, id: p.id }, noStore());
}