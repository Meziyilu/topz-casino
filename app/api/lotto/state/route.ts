// app/api/lotto/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_LOTTO_CONFIG, LOTTO_CONFIG_KEY, type LottoConfig } from "@/lib/lotto";

const noStore = (payload: any, status = 200) =>
  NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

async function readConfig(): Promise<LottoConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { key: LOTTO_CONFIG_KEY } });
  if (!row) return DEFAULT_LOTTO_CONFIG;
  return { ...DEFAULT_LOTTO_CONFIG, ...(row.value as Partial<LottoConfig>) };
}

export async function GET() {
  const [cfg, openRound, recent] = await Promise.all([
    readConfig(),
    prisma.lottoRound.findFirst({
      where: { status: "OPEN" },
      orderBy: [{ drawAt: "asc" }],
      select: { id: true, code: true, drawAt: true, status: true },
    }),
    prisma.lottoRound.findMany({
      where: { status: { in: ["DRAWN", "SETTLED"] } },
      orderBy: [{ code: "desc" }],
      take: 10,
      select: { code: true, drawAt: true, numbers: true, special: true, jackpot: true, pool: true, status: true },
    }),
  ]);

  const now = Date.now();
  const timeLeftSec = openRound ? Math.max(0, Math.floor((new Date(openRound.drawAt).getTime() - now) / 1000)) : 0;

  return noStore({
    ok: true,
    serverTime: new Date().toISOString(),
    cfg,
    current: openRound
      ? { id: openRound.id, code: openRound.code, drawAt: openRound.drawAt, status: openRound.status, timeLeftSec }
      : null,
    recent,
  });
}
