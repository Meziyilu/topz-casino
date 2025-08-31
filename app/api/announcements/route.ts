export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, enabled: true, createdAt: true },
    });
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
