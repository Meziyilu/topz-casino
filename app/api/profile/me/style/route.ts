export const dynamic = "force-dynamic"; export const revalidate = 0;
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { HeadframeCode, PanelPreset } from "@prisma/client";


function noStore(init?: number){
return { status: init ?? 200, headers: {
"Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
Pragma:"no-cache", Expires:"0"
}} as any;
}


export async function GET(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const me = await prisma.user.findUnique({ where: { id: token.sub }, select: { headframe:true, panelStyle:true, panelTint:true } });
return NextResponse.json(me, noStore());
}


export async function PATCH(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { headframe, panelStyle, panelTint } = await req.json();
const hf = Object.values(HeadframeCode).includes(headframe) ? headframe : undefined;
const ps = Object.values(PanelPreset).includes(panelStyle) ? panelStyle : undefined;
const tint = typeof panelTint === "string" && panelTint.length <= 20 ? panelTint : undefined;
const updated = await prisma.user.update({ where: { id: token.sub }, data: { headframe: hf as any, panelStyle: ps as any, panelTint: tint } });
return NextResponse.json({ ok: true, headframe: updated.headframe, panelStyle: updated.panelStyle, panelTint: updated.panelTint }, noStore());
}