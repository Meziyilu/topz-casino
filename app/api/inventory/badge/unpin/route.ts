export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);
    const { userBadgeId } = await req.json();

    const ub = await prisma.userBadge.findUnique({ where: { id: userBadgeId }});
    if (!ub || ub.userId !== me.id) return bad("Not your badge");

    await prisma.userBadge.update({ where: { id: userBadgeId }, data: { pinned: false }});
    return ok({ pinned: false });
  } catch (e: any) { return fail(e.message); }
}
