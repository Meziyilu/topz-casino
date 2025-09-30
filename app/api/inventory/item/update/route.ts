export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { ok, bad, fail } from "@/lib/utils/respond";
import { prisma } from "@/lib/prisma";

// 用於收藏品 favorite 或擴充備註/自定旗標（這裡示範 favorite）
export async function POST(req: NextRequest) {
  try {
    const me = await getUserFromRequest(req);
    if (!me) return bad("Unauthorized", 401);

    const { kind, id, favorite } = await req.json();

    if (kind === "COLLECTIBLE") {
      const uc = await prisma.userCollectible.findUnique({ where: { id } });
      if (!uc || uc.userId !== me.id) return bad("Not your collectible");
      await prisma.userCollectible.update({ where: { id }, data: { favorite: !!favorite } });
      return ok({ favorite: !!favorite });
    }

    // 其他類型可擴充
    return bad("Unsupported kind");
  } catch (e: any) {
    return fail(e.message);
  }
}
