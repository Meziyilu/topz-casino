import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const items = await prisma.sicboBet.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 50
  });
  return NextResponse.json({ items });
}
