// app/api/admin/users/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function noStoreJson<T>(payload: T, status = 200) {
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
    const gate = await requireAdmin(req);
    if (!gate.ok) return gate.res;

    const id = ctx.params.id;
    if (!id) return noStoreJson({ error: "缺少 id" } as const, 400);

    await prisma.user.delete({ where: { id } });
    return noStoreJson({ ok: true } as const);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return noStoreJson({ error: msg } as const, 500);
  }
}
