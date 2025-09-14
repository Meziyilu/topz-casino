import { NextResponse } from "next/server";
import { currentState } from "@/services/baccarat.service";

export async function GET(
  _req: Request,
  { params }: { params: { code: "R30"|"R60"|"R90" } }
) {
  try {
    const data = await currentState(params.code);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
