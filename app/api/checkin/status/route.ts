// app/(player-suite)/api/checkin/status/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/jwt";

function todayYmdUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0,0,0));
}

export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.sub) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const userId = auth.sub as string;
  const ymd = todayYmdUTC();

  const [state, claimed] = await Promise.all([
    prisma.userCheckinState.findUnique({ where: { userId } }),
    prisma.dailyCheckinClaim.findUnique({ where: { userId_ymd: { userId, ymd } } }),
  ]);

  return NextResponse.json({
    today: ymd.toISOString(),
    streak: state?.streak ?? 0,
    lastClaimedYmd: state?.lastClaimedYmd ?? null,
    nextAvailableAt: state?.nextAvailableAt ?? null,
    todayClaimed: !!claimed,
  });
}
