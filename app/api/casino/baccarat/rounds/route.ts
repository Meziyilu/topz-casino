import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得近期局數（用於路子/歷史）
export async function POST(req: NextRequest) {
  try {
    const { room, take = 20 } = await req.json();
    const rounds = await prisma.round.findMany({
      where: { room },
      orderBy: { startedAt: "desc" },
      take,
    });

    const list = rounds.map((r) => ({
      id: r.id,
      seq: r.seq,
      startedAt: r.startedAt.toISOString(),
      outcome: r.outcome,
      result: r.resultJson ? JSON.parse(r.resultJson) : null,
    }));

    return NextResponse.json({ rounds: list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
