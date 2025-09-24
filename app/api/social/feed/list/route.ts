import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const items = await prisma.feed.findMany({
    take: 10,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    items,
    nextCursor: items.length === 10 ? items[items.length - 1].id : null,
  });
}
