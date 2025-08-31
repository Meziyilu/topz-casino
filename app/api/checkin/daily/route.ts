// app/api/checkin/daily/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

function noStoreJson(payload: any, status = 200) {
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
  { day: 1, reward: 100 },
  { day: 2, reward: 100 },
  { day: 3, reward: 100 },
  { day: 4, reward: 100 },
  { day: 5, reward: 100 },
  { day: 6, reward: 100 },
  { day: 7, reward: 300 },
];

export async function GET() {
  return noStoreJson({ ok: true, weekly: WEEKLY_TABLE });
}
