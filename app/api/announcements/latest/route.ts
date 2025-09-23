import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const item = await prisma.announcement.findFirst({
    where: {
      enabled: true,
      OR: [{ startAt: null }, { startAt: { lte: now } }],
      AND: [{ endAt: null }, { endAt: { gte: now } }],
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ item });
}
