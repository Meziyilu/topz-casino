// app/api/admin/lotto/draws/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // OPEN | LOCKED | DRAWN | SETTLED
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);

  const where = status ? { status } : {};
  const items = await prisma.lottoDraw.findMany({
    where,
    orderBy: { drawAt: "desc" },
    take,
  });

  return NextResponse.json({ items });
}
