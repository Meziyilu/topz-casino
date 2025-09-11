import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOptionalUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getOptionalUserId(req); // ✅ await
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const items = await prisma.sicboBet.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    take: 50
  });
  return NextResponse.json({ items });
}
