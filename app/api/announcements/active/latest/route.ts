export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** 只取最上面的有效公告（排序：updatedAt desc, createdAt desc） */
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
    take: 1,
  });

  return NextResponse.json({ item: rows[0] ?? null });
}
