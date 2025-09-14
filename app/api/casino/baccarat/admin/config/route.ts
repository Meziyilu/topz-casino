import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KEYS = [
  "BACCARAT:betSeconds",
  "BACCARAT:revealSeconds",
  "BACCARAT:payout:PLAYER",
  "BACCARAT:payout:BANKER",
  "BACCARAT:payout:TIE",
  "BACCARAT:payout:PLAYER_PAIR",
  "BACCARAT:payout:BANKER_PAIR",
  "BACCARAT:payout:ANY_PAIR",
  "BACCARAT:payout:PERFECT_PAIR",
  "BACCARAT:payout:BANKER_SUPER_SIX",
];

export async function GET() {
  try {
    const rows = await prisma.gameConfig.findMany({
      where: { gameCode: "BACCARAT", key: { in: KEYS } },
    });
    const map: Record<string, number | string | boolean | null> = {};
    for (const r of rows) map[r.key] = r.valueInt ?? r.valueFloat ?? r.valueString ?? r.valueBool ?? null;
    return NextResponse.json({ config: map });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, number | string | boolean>;
    const entries = Object.entries(body).filter(([k]) => KEYS.includes(k));

    await Promise.all(entries.map(([key, v]) =>
      prisma.gameConfig.upsert({
        where: { gameCode_key: { gameCode: "BACCARAT", key } },
        create: { gameCode: "BACCARAT", key, valueFloat: typeof v === "number" ? v : undefined, valueString: typeof v === "string" ? v : undefined, valueBool: typeof v === "boolean" ? v : undefined },
        update: { valueFloat: typeof v === "number" ? v : undefined, valueString: typeof v === "string" ? v : undefined, valueBool: typeof v === "boolean" ? v : undefined },
      })
    ));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
