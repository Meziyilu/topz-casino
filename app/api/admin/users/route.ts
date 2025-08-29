// app/api/admin/users/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    // 權限：僅管理員
    await requireAdmin(req);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    // 關鍵：把 where 明確標註為 Prisma.UserWhereInput
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name:  { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
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

    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    const msg = e?.message || "Server error";
    const code = msg.includes("管理員") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
