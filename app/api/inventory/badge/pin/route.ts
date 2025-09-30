export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { prisma } from "@/lib/prisma";
import { BADGE_PIN_LIMIT } from "@/lib/rules/equip-rules";

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);
    const { userBadgeId } = await req.json();

    const ub = await prisma.userBadge.findUnique({ where: { id: userBadgeId }});
    if (!ub || ub.userId !== me.id) return bad("Not your badge");

    const pinnedCount = await prisma.userBadge.count({ where: { userId: me.id, pinned: true }});
    if (pinnedCount >= BADGE_PIN_LIMIT) return bad(`Pinned limit is ${BADGE_PIN_LIMIT}`);

    await prisma.userBadge.update({ where: { id: userBadgeId }, data: { pinned: true }});
    return ok({ pinned: true });
  } catch (e: any) { return fail(e.message); }
}
