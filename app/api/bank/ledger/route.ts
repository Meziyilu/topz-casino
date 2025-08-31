// app/api/bank/ledger/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

export async function GET(req: Request) {
  const token = await verifyJWT(req);
  if (!token) return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
  const type = url.searchParams.get("type") as any || undefined;
  const peer = url.searchParams.get("peer"); // peerUserId 篩選
  const groupId = url.searchParams.get("groupId");

  const where: any = { userId: token.userId };
  if (type) where.type = type;
  if (peer) where.peerUserId = peer;
  if (groupId) where.transferGroupId = groupId;

  const items = await prisma.ledger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      type: true,
      target: true,
      delta: true,
      amount: true,
      fee: true,
      memo: true,
      fromTarget: true,
      toTarget: true,
      transferGroupId: true,
      peerUserId: true,
      balanceAfter: true,
      bankAfter: true,
      meta: true,
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const next = items.pop()!;
    nextCursor = next.id;
  }

  return NextResponse.json({ ok: true, data: { items, nextCursor } });
}
