export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { loadConfig, saveConfig, LottoConfig } from "@/lib/lotto";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

export async function GET(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStoreJson({ error: "FORBIDDEN" }, 403);
  const cfg = await loadConfig();
  return noStoreJson({ value: cfg });
}

export async function PUT(req: Request) {
  const auth = verifyRequest(req);
  if (!auth?.isAdmin) return noStoreJson({ error: "FORBIDDEN" }, 403);
  const body = (await req.json()) as { value: LottoConfig };
  const v = body?.value;
  if (!v) return noStoreJson({ error: "INVALID_BODY" }, 400);
  if (v.picksCount < 1 || v.picksCount > 10) return noStoreJson({ error: "INVALID_picksCount" }, 400);
  if (v.pickMax < v.picksCount || v.pickMax > 99) return noStoreJson({ error: "INVALID_pickMax" }, 400);
  if (v.bigThreshold < 2 || v.bigThreshold > v.pickMax) return noStoreJson({ error: "INVALID_bigThreshold" }, 400);
  await saveConfig(v);
  return noStoreJson({ ok: true });
}
