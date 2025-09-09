import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST() {
  // 如果你有 AdminLog 表可以在這裡清，沒有就回 ok
  return NextResponse.json({ ok: true });
}
