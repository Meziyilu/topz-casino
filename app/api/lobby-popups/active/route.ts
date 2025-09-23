// app/api/lobby-popups/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const item = await prisma.lobbyPopup.findFirst({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ item }, { headers: { "cache-control": "no-store" } });
}
