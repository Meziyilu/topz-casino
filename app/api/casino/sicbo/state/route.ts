import { NextRequest, NextResponse } from "next/server";
import SicboService from "@/services/sicbo.service";
import type { RoomKey } from "@/lib/sicbo/types";
import { getOptionalUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const room = (req.nextUrl.searchParams.get("room") || "R60") as RoomKey;
  const userId = getOptionalUserId(req);
  try {
    const dto = await SicboService.getState(room, userId ?? undefined);
    return NextResponse.json(dto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
