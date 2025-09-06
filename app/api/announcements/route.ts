// app/api/announcements/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("ANNOUNCEMENTS_GET", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}
