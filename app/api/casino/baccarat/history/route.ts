import { NextResponse } from "next/server";
import { getPublicRounds } from "@/services/baccarat.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as "R30" | "R60" | "R90";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const rounds = await getPublicRounds(room, limit);

    return NextResponse.json({ rounds });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
