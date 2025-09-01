// app/api/checkin/daily/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

function noStoreJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// 你可以自訂週期獎勵表
const WEEKLY_TABLE = [
  { day: 1, reward: 1000 },
  { day: 2, reward: 2000 },
  { day: 3, reward: 3000 },
  { day: 4, reward: 4000 },
  { day: 5, reward: 5000 },
  { day: 6, reward: 6000 },
  { day: 7, reward: 10000 },
];

export async function GET() {
  return noStoreJson({ ok: true, weekly: WEEKLY_TABLE });
}
