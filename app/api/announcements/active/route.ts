import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // 依你的路徑

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "20");

  const now = new Date();
  const items = await prisma.announcement.findMany({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, Math.min(100, limit)),
  });

  return NextResponse.json(
    { items },
    { headers: { "cache-control": "no-store" } }
  );
}
