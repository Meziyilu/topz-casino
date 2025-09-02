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


const me = await prisma.user.findUnique({ where: { id: token.sub } });
if (!me) return NextResponse.json({ error: "NotFound" }, { status: 404 });


// 初始化預設模組
const exist = await prisma.userProfileModule.findFirst({ where: { userId: me.id } });
if (!exist) {
const defs = ["AVATAR_FRAME","BASIC_INFO","BADGES","STATS"] as const;
await prisma.$transaction(defs.map((code,i)=> prisma.userProfileModule.create({
data: { userId: me.id, code: code as any, enabled: true, sortOrder: (i+1)*10 }
})));
}


const [modules, style, pinned] = await Promise.all([
prisma.userProfileModule.findMany({ where: { userId: me.id }, orderBy: { sortOrder: "asc" } }),
prisma.userProfileSettings.findUnique({ where: { userId: me.id } }),
prisma.userBadge.findMany({ where: { userId: me.id, pinned: true }, include: { badge: true }, orderBy: { acquiredAt: "desc" } }),
]);


return NextResponse.json({
user: {
id: me.id, email: me.email, name: me.name,
nickname: me.nickname ?? me.name ?? me.email.split("@")[0],
avatarUrl: me.avatarUrl ?? null, about: me.about ?? "", country: me.country ?? null,
createdAt: me.createdAt, xp: me.xp, level: me.level, vipTier: me.vipTier, vipExpireAt: me.vipExpireAt,
headframe: me.headframe, panelStyle: me.panelStyle, panelTint: me.panelTint, publicSlug: me.publicSlug,
balances: { wallet: me.balance, bank: me.bankBalance },
},
style: style ?? null,
modules,
badgesPinned: pinned.map(p=> ({ code: p.badge.code, name: p.badge.name, iconUrl: p.badge.iconUrl, rarity: p.badge.rarity }))
}, noStore());
}


export async function PATCH(req: Request){
const token = await verifyJWT(req.headers);
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const body = await req.json().catch(()=>({}));
const { nickname, about, country, avatarUrl } = body || {};


const updated = await prisma.user.update({
}