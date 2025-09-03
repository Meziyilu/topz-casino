export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getPublicState } from "@/services/lotto.service";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" },
  });
}

export async function GET() {
  const state = await getPublicState();
  return noStoreJson(state);
}
