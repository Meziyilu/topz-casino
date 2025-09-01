// app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";

function json<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 取得使用者清單（可搜尋 q）
export async function GET(req: Request) {
  try {
    const gate = await requireAdmin(req);
    if (!gate.ok) return gate.res;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    let take = Number.parseInt(url.searchParams.get("take") || "100", 10);
    if (!Number.isFinite(take) || take <= 0) take = 100;
    if (take > 200) take = 200;

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        balance: true,
        bankBalance: true,
        createdAt: true,
      },
    });

    return json({ ok: true, users });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return json({ ok: false, error: msg }, 500);
  }
}
