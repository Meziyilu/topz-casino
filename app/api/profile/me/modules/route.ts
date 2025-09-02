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
const [mods, settings] = await Promise.all([
prisma.userProfileModule.findMany({ where: { userId: token.sub }, orderBy: { sortOrder: "asc" } }),
prisma.userProfileSettings.findUnique({ where: { userId: token.sub } })
]);
return NextResponse.json({ modules: mods, layout: settings?.layoutJson ?? null }, noStore());
}


export async function PUT(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { modules, layout } = await req.json();
if (!Array.isArray(modules)) return NextResponse.json({ error: "BadRequest" }, { status: 400 });


await prisma.$transaction(async (tx)=>{
for (const m of modules){
await tx.userProfileModule.upsert({
where: { userId_code: { userId: token.sub, code: m.code } },
update: { enabled: !!m.enabled, sortOrder: m.sortOrder ?? 100, config: m.config ?? undefined },
create: { userId: token.sub, code: m.code, enabled: !!m.enabled, sortOrder: m.sortOrder ?? 100, config: m.config ?? undefined }
});
}
if (layout) {
await tx.userProfileSettings.upsert({ where: { userId: token.sub }, update: { layoutJson: layout }, create: { userId: token.sub, layoutJson: layout } });
}
});


return NextResponse.json({ ok: true }, noStore());
}