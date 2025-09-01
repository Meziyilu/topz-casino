// route.ts
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.marqueeMessage.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        text: true,
        enabled: true,
        priority: true,
        createdAt: true,
      },
    });

    return NextResponse.json(list, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
