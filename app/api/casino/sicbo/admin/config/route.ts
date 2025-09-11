// app/api/casino/sicbo/admin/config/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const KEYS = [
  "drawIntervalSec",
  "lockBeforeRollSec",
  "room.SB_R30.drawIntervalSec",
  "room.SB_R60.drawIntervalSec",
  "room.SB_R90.drawIntervalSec",
  "bet.min",
  "bet.max",
  "bet.totalMaxPerRound",
];

export async function GET() {
  const rows = await prisma.gameConfig.findMany({
    where: { gameCode: "SICBO", key: { in: KEYS } },
  });
  const map = Object.fromEntries(
    rows.map(r => [r.key, r.valueInt ?? r.valueBool ?? r.valueFloat ?? r.valueString ?? r.json])
  );
  return NextResponse.json({ items: map });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entries = Object.entries(body || {}).filter(([k]) => KEYS.includes(k));

  await Promise.all(entries.map(([key, val]) =>
    prisma.gameConfig.upsert({
      where: { gameCode_key: { gameCode: "SICBO", key } },
      update: {
        valueInt: typeof val === "number" ? val : null,
        valueFloat: typeof val === "number" ? val : null,
        valueBool: typeof val === "boolean" ? val : null,
        valueString: typeof val === "string" ? val : null,
        json: typeof val === "object" && val !== null ? val : null,
      },
      create: {
        gameCode: "SICBO",
        key,
        valueInt: typeof val === "number" ? val : null,
        valueFloat: typeof val === "number" ? val : null,
        valueBool: typeof val === "boolean" ? val : null,
        valueString: typeof val === "string" ? val : null,
        json: typeof val === "object" && val !== null ? val : null,
      },
    })
  ));

  return NextResponse.json({ ok: true });
}
