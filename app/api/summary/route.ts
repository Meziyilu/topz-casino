export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);

    const [user, pinned, headframes, inv] = await Promise.all([
      prisma.user.findUnique({ where: { id: me.id }, select: { headframe: true } }),
      prisma.userBadge.findMany({
        where: { userId: me.id, pinned: true },
        include: { badge: true },
        orderBy: { acquiredAt: "desc" },
        take: 6,
      }),
      prisma.userHeadframe.findMany({ where: { userId: me.id } }),
      prisma.userInventory.findMany({ where: { userId: me.id }, orderBy: { acquiredAt: "desc" }, take: 24 }),
    ]);

    const counts = {
      HEADFRAME: inv.filter(i => i.type === "HEADFRAME").length,
      BADGE: inv.filter(i => i.type === "BADGE").length,
      COLLECTIBLE: inv.filter(i => i.type === "COLLECTIBLE").length,
      OTHER: inv.filter(i => i.type === "OTHER").length,
      TOTAL: inv.length,
    };

    const recent = inv.slice(0, 6).map(i => ({
      id: i.id, type: i.type, refId: i.refId, acquiredAt: i.acquiredAt.toISOString(),
    }));

    return ok({
      user: { headframe: user?.headframe ?? null },
      pinnedBadges: pinned.map(p => ({ id: p.id, name: p.badge?.name ?? "Badge", iconUrl: p.badge?.iconUrl ?? null })),
      headframes: headframes.map(h => ({ code: h.code, expiresAt: h.expiresAt ? h.expiresAt.toISOString() : null })),
      counts, recent,
    });
  } catch (e: any) {
    return fail(e.message);
  }
}
