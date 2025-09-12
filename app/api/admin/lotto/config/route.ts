// app/api/admin/lotto/config/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readConfig, writeConfig } from "@/services/lotto.service";

export async function GET() {
  const cfg = await readConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: Request) {
  const body = await req.json();
  await writeConfig(body);
  return NextResponse.json({ ok: true });
}
