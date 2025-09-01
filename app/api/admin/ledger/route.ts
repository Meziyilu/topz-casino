// app/api/admin/ledger/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth"; // 保持原 import

function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  let limit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 50;
  if (limit > 200) limit = 200;

  const cursor = url.searchParams.get("cursor");

  const rows = await prisma.ledger.findMany({
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    // 也可以限定欄位，避免 payload 太大；要全欄位就移除 select
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
      userId: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return noStoreJson({ ok: true, data: { items, nextCursor, limit } });
}
