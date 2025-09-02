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


const url = new URL(req.url);
const op = url.searchParams.get("op") ?? "toggle";
if (op === "toggle"){
const found = await prisma.wallLike.findUnique({ where: { postId_userId: { postId: params.id, userId: token.sub } } });
if (found) {
await prisma.wallLike.delete({ where: { id: found.id } });
return NextResponse.json({ liked: false }, noStore());
}
await prisma.wallLike.create({ data: { postId: params.id, userId: token.sub } });
return NextResponse.json({ liked: true }, noStore());
}
return NextResponse.json({ error: "Unsupported" }, { status: 400 });
}