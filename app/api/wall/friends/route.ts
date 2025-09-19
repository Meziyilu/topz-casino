// app/api/wall/friends/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  if (!me) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
  const cursor = searchParams.get("cursor") || undefined;

  // 取好友 id
  const links = await prisma.friend.findMany({
    where: { userId: me.id },
    select: { friendId: true },
  });
  const friendIds = links.map(l => l.friendId);

  const authorIds = [me.id, ...friendIds];

  const posts = await prisma.wallPost.findMany({
    where: { authorId: { in: authorIds } },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, vipTier: true } },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const nextItem = posts.pop()!;
    nextCursor = nextItem.id;
  }

  return NextResponse.json({ items: posts, nextCursor });
}
