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
      select: { id: true, text: true, enabled: true, priority: true, createdAt: true },
    });
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
