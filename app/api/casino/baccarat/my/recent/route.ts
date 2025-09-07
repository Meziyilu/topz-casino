// app/api/casino/baccarat/my/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromNextRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getUserFromNextRequest(req);
  if (!auth?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const Schema = z.object({
    room: z.nativeEnum(RoomCode),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  });
  const parsed = Schema.safeParse({
    room: url.searchParams.get("room") as unknown,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_QUERY" }, { status: 400 });

  const rows = await prisma.bet.findMany({
    where: { userId: auth.id, round: { room: parsed.data.room } },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit ?? 20,
    select: { id: true, side: true, amount: true, createdAt: true, roundId: true },
  });

  return NextResponse.json({ ok: true, items: rows });
}
