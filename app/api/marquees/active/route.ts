export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** 取目前有效的跑馬燈訊息（優先度高者在前） */
export async function GET() {
  const now = new Date();
  const rows = await prisma.marqueeMessage.findMany({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({ items: rows });
}
