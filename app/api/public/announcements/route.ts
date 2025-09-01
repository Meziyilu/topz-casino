export const runtime = "nodejs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const list = await prisma.announcement.findMany({
    where: {
      enabled: true,
      OR: [
        { startAt: null },
        { startAt: { lte: now } },
      ],
      AND: [
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(list);
}
