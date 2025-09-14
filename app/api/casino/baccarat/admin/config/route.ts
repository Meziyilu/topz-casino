// app/api/casino/baccarat/admin/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得百家樂設定
export async function GET() {
  try {
    const rows = await prisma.gameConfig.findMany({
      where: { gameCode: "BACCARAT" },
    });

    const map: Record<string, number | string | boolean | null> = {};
    for (const r of rows) {
      let v: string | number | boolean | null = null;

      if (r.valueInt !== null && r.valueInt !== undefined) {
        v = Number(r.valueInt); // ✅ BigInt → number
      } else if (r.valueFloat !== null && r.valueFloat !== undefined) {
        v = r.valueFloat;
      } else if (r.valueString !== null && r.valueString !== undefined) {
        v = r.valueString;
      } else if (r.valueBool !== null && r.valueBool !== undefined) {
        v = r.valueBool;
      }

      map[r.key] = v;
    }

    return NextResponse.json({ config: map });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

// 更新百家樂設定
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entries = Object.entries(body) as [string, any][];

    for (const [key, value] of entries) {
      await prisma.gameConfig.upsert({
        where: { gameCode_key: { gameCode: "BACCARAT", key } },
        update: {
          valueInt:
            typeof value === "number" && Number.isInteger(value)
              ? BigInt(value) // ✅ 存 BigInt
              : null,
          valueFloat:
            typeof value === "number" && !Number.isInteger(value)
              ? value
              : null,
          valueString: typeof value === "string" ? value : null,
          valueBool: typeof value === "boolean" ? value : null,
        },
        create: {
          gameCode: "BACCARAT",
          key,
          valueInt:
            typeof value === "number" && Number.isInteger(value)
              ? BigInt(value)
              : null,
          valueFloat:
            typeof value === "number" && !Number.isInteger(value)
              ? value
              : null,
          valueString: typeof value === "string" ? value : null,
          valueBool: typeof value === "boolean" ? value : null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
