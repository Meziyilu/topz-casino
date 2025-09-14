export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentState } from "@/services/baccarat.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") ?? "R30") as any;
  const s = await currentState(room);
  return NextResponse.json(s);
}
