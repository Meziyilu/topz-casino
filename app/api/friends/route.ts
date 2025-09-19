// app/api/friends/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// 若你的 prisma 是 default export，改成：import prisma from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  // 無向關係：找出任何一邊是我的紀錄
  const links = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
    orderBy: { since: "desc" },
    include: {
      userA: { select: { id: true, email: true, displayName: true, avatarUrl: true, vipTier: true } },
      userB: { select: { id: true, email: true, displayName: true, avatarUrl: true, vipTier: true } },
    },
  });

  // 取出「對方」
  const friends = links.map((l) => {
    const other = l.userAId === me.id ? l.userB : l.userA;
    return {
      id: other.id,
      email: other.email,
      displayName: other.displayName,
      avatarUrl: other.avatarUrl,
      vipTier: other.vipTier,
      since: l.since,
    };
  });

  return NextResponse.json({ friends });
}
