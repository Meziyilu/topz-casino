import { NextResponse } from "next/server";
import { currentState } from "@/services/baccarat.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const room = (searchParams.get("room") || "R30") as "R30"|"R60"|"R90";
    const state = await currentState(room);
    return NextResponse.json(state);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
