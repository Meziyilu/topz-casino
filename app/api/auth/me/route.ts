export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const me = await getUserFromRequest(req);
    return NextResponse.json({ user: me });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
