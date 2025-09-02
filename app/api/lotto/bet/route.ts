export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { placeBets, BetItem } from "@/services/lotto.service";
import { verifyRequest } from "@/lib/auth";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

type PlaceBetBody = { items: BetItem[] };

export async function POST(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.userId) return noStoreJson({ error: "UNAUTHORIZED" }, 401);

  const body = (await req.json()) as PlaceBetBody;
  if (!body?.items?.length) return noStoreJson({ error: "INVALID_BODY" }, 400);

  const res = await placeBets(auth.userId, body.items);
  if (!res.ok) return noStoreJson({ error: res.error }, 400);
  return noStoreJson({ ok: true, code: res.code, total: res.total });
}
