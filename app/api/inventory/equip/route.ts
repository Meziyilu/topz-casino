export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { equipHeadframe, setInventoryEquipped } from "@/lib/services/inventory.service";

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);

    const { type, refId, inventoryId } = await req.json();

    if (type === "HEADFRAME") {
      if (!refId) return bad("refId required");
      await equipHeadframe(me.id, refId);
      return ok({ headframe: refId });
    }

    // 其他類型：用 UserInventory 的 equipped 旗標
    if (inventoryId) {
      await setInventoryEquipped(me.id, inventoryId, true);
      return ok({ equipped: true });
    }

    return bad("Unsupported type");
  } catch (e: any) {
    return fail(e.message);
  }
}
