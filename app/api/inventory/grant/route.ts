export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ok, bad, fail } from "@/lib/utils/respond";
import { adminGrantInventory } from "@/lib/services/inventory.service";

export async function POST(req: NextRequest) {
  try {
    // TODO: verify admin
    const { userId, type, refId, quantity = 1, durationDays = null } = await req.json();
    if (!userId || !type) return bad("userId & type required");

    const row = await adminGrantInventory({ userId, type, refId: refId ?? null, quantity, durationDays });
    return ok(row);
  } catch (e: any) {
    return fail(e.message);
  }
}
