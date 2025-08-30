// app/api/admin/users/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

function json(payload: any, status = 200) {
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
    const me = await getUserFromRequest(req);
    if (!me?.isAdmin) return json({ error: "需要管理員權限" }, 403);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const take = Math.min(Number(url.searchParams.get("take") || 100), 200);

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            // 如果 User.name 在 schema 裡是可選欄位，照樣可以用 contains 搜尋
            { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
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

    return json({ users });
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
