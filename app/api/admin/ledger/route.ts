// app/api/admin/ledger/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "";
    const limit = Math.max(10, Math.min(200, Number(url.searchParams.get("limit") || 50)));
    const cursor = url.searchParams.get("cursor") || undefined;

    const where = userId ? { userId } : {};

    const rows = await prisma.ledger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        userId: true,
        type: true,
        delta: true,
        memo: true,
        balanceAfter: true,
        bankAfter: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (rows.length > limit) {
      nextCursor = rows[limit].id;
      rows.splice(limit);
    }

    return noStoreJson({ items: rows, nextCursor });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}
