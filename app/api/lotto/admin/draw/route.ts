export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRequest } from "@/lib/auth";
import { LottoRoundStatus } from "@prisma/client";
import { drawNumbers, loadConfig, settleRoundTx } from "@/lib/lotto";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStoreJson({ error: "FORBIDDEN" }, 403);

  const cfg = await loadConfig();
  const cur = await prisma.lottoRound.findFirst({
    orderBy: [{ day: "desc" }, { code: "desc" }],
    select: { id: true, code: true, status: true, numbers: true, special: true, drawAt: true, pool: true, jackpot: true },
  });
  if (!cur) return noStoreJson({ error: "NO_ROUND" }, 400);
  if (cur.status === LottoRoundStatus.SETTLED) return noStoreJson({ ok: true, message: "ALREADY_SETTLED" });

  if (cur.status === LottoRoundStatus.OPEN || cur.status === LottoRoundStatus.LOCKED) {
    const drawn = drawNumbers(cfg.picksCount, cfg.pickMax);
    await prisma.lottoRound.update({ where: { id: cur.id }, data: { status: LottoRoundStatus.DRAWN, numbers: drawn.numbers, special: drawn.special } });
  }

  const res = await settleRoundTx(cur.id, cfg);
  return noStoreJson({ ok: true, code: cur.code, ...res });
}
