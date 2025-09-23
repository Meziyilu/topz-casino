// app/api/lobby-popups/ack/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { popupId, userId } = await req.json();
    if (!popupId) return NextResponse.json({ error: "popupId required" }, { status: 400 });

    if (userId) {
      await prisma.lobbyPopupAck.create({
        data: { popupId, userId },
      });
    }
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
