export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const me = await getUserFromRequest(req);
  return NextResponse.json({ user: me ?? null });
}
