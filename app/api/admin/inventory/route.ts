export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, bad, fail } from "@/lib/utils/respond";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // TODO: verify admin (JWT/Role)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return bad("userId required");

    const [user, items, headframes, badges, collectibles] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, headframe: true } }),
      prisma.userInventory.findMany({ where: { userId }, orderBy: { acquiredAt: "desc" } }),
      prisma.userHeadframe.findMany({ where: { userId } }),
      prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
      prisma.userCollectible.findMany({ where: { userId }, include: { collectible: true } }),
    ]);

    return ok({ user, items, headframes, badges, collectibles });
  } catch (e: any) { return fail(e.message); }
}
