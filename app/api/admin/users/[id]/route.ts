export const runtime = "nodejs";
// app/api/admin/users/[id]/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function noStoreJson(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const id = ctx.params.id;
    if (!id) return noStoreJson({ error: "缺少 id" }, 400);

    await prisma.user.delete({ where: { id } });
    return noStoreJson({ ok: true });
  } catch (e: any) {
    return noStoreJson({ error: e?.message || "Server error" }, e?.status || 500);
  }
}
