export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  // ✅ 明確標註型別，避免被推論成一般物件
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          {
            email: {
              contains: q,
              // ✅ 用字面量或 Prisma.QueryMode.insensitive
              mode: "insensitive", // or: Prisma.QueryMode.insensitive
            },
          },
          {
            displayName: {
              contains: q,
              mode: "insensitive",
            },
          },
          { id: q }, // 直接匹配 id
        ],
      }
    : {};

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      displayName: true,
      balance: true,
      bankBalance: true,
    },
  });

  return NextResponse.json({ items });
}
