export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { unequipHeadframe, setInventoryEquipped } from "@/lib/services/inventory.service";

export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);

    const { type, inventoryId } = await req.json();

    if (type === "HEADFRAME") {
      await unequipHeadframe(me.id);
      return ok({ headframe: "NONE" });
    }

    if (inventoryId) {
      await setInventoryEquipped(me.id, inventoryId, false);
      return ok({ equipped: false });
    }

    return bad("Unsupported type");
  } catch (e: any) {
    return fail(e.message);
  }
}
