export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** 取目前有效的公告（enabled=true 且 now ∈ [startAt, endAt]） */
export async function GET() {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({ items: rows });
}
