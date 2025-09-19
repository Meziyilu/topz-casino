// app/api/wall/friends/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// 若你的 prisma 是 default export，請改成：import prisma from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
  const cursor = searchParams.get("cursor") || undefined;

  // 取「與我相關」的無向好友關係
  const links = await prisma.friendship.findMany({
    where: { OR: [{ userAId: me.id }, { userBId: me.id }] },
    select: { userAId: true, userBId: true },
  });

  // 萃取朋友 id（另一端）
  const friendIds = links.map(l => (l.userAId === me.id ? l.userBId : l.userAId));
  const authorIds = [me.id, ...friendIds];

  const posts = await prisma.wallPost.findMany({
    where: { userId: { in: authorIds }, hidden: false },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true, vipTier: true } },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const nextItem = posts.pop()!;
    nextCursor = nextItem.id;
  }

  // 對齊前端 FriendWall.tsx 欄位（author）
  const items = posts.map(p => ({
    id: p.id,
    body: p.body,
    createdAt: p.createdAt,
    author: {
      id: p.user.id,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      vipTier: p.user.vipTier,
    },
  }));

  return NextResponse.json({ items, nextCursor });
}
