// app/api/friends/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const links = await prisma.friend.findMany({
    where: { userId: me.id },
    select: { friendId: true, createdAt: true, friend: { select: {
      id: true, email: true, displayName: true, avatarUrl: true, vipTier: true
    } } },
    orderBy: { createdAt: "desc" },
  });

  const friends = links.map(l => ({
    id: l.friend.id,
    email: l.friend.email,
    displayName: l.friend.displayName,
    avatarUrl: l.friend.avatarUrl,
    vipTier: l.friend.vipTier,
    since: l.createdAt,
  }));

  return NextResponse.json({ friends });
}
