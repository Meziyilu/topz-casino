// app/api/casino/baccarat/admin/reset/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { room } = (await req.json()) as { room: "R30" | "R60" | "R90" };

  const cur = await prisma.round.findFirst({
    where: { room },
    orderBy: [{ startedAt: "desc" }],
  });

  if (cur) {
    await prisma.round.update({
      where: { id: cur.id },
      data: { phase: "SETTLED", endedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
