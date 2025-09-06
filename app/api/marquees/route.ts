// app/api/marquee/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.marqueeMessage.findMany({
      where: { enabled: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
    // 前端跑馬燈要字串陣列，這裡直接轉一下
    const texts = items.map(i => i.text);
    return NextResponse.json({ ok: true, items, texts });
  } catch (e) {
    console.error("MARQUEE_GET", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
