// app/api/bank/ledger/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";
import type { Prisma } from "@prisma/client";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status, headers: { "cache-control": "no-store" } });
}

// 允許的 LedgerType（對齊 schema）
const LEDGER_TYPES = new Set([
  "DEPOSIT",
  "WITHDRAW",
  "BET_PLACED",
  "PAYOUT",
  "TRANSFER",
  "ADMIN_ADJUST",
] as const);

export async function GET(req: Request) {
  // 驗證
  const auth = await verifyRequest(req);
  const userId =
    (auth as { userId?: string; sub?: string } | null)?.userId ??
    (auth as { sub?: string } | null)?.sub ??
    null;
  if (!userId) return json({ ok: false, error: "UNAUTH" } as const, 401);

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || null;

  let limit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  if (limit > 100) limit = 100;

  const typeParam = url.searchParams.get("type");
  const typeFilter =
    typeParam && LEDGER_TYPES.has(typeParam as any) ? (typeParam as Prisma.$Enums.LedgerType) : undefined;

  const peer = url.searchParams.get("peer") || undefined;
  const groupId = url.searchParams.get("groupId") || undefined;

  const where: Prisma.LedgerWhereInput = {
    userId: String(userId),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(peer ? { peerUserId: peer } : {}),
    ...(groupId ? { transferGroupId: groupId } : {}),
  };

  const take = limit + 1;
  const items = await prisma.ledger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
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
  let list = items;
  if (items.length > limit) {
    const next = items[items.length - 1];
    nextCursor = next.id;
    list = items.slice(0, limit);
  }

  return json({ ok: true, data: { items: list, nextCursor } } as const);
}
