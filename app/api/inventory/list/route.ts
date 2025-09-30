export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { listMyInventory } from "@/lib/services/inventory.service";

export async function GET(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);
    const data = await listMyInventory(me.id);
    return ok(data);
  } catch (e: any) {
    return fail(e.message);
  }
}
