import { NextRequest, NextResponse } from "next/server";
import type { RoomCode } from "@prisma/client";
import { getOptionalUserId } from "@/lib/auth";
import SicboService from "@/services/sicbo.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const room = (req.nextUrl.searchParams.get("room") || "R60") as RoomCode;
  const userId = getOptionalUserId(req);

  try {
    const dto = await SicboService.getState(room as any, userId ?? undefined);
    return NextResponse.json(dto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
