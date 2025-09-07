// app/api/casino/baccarat/stream/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { getCurrentRound } from "@/services/baccarat.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const Schema = z.object({ room: z.nativeEnum(RoomCode) });
  const parsed = Schema.safeParse({ room: url.searchParams.get("room") as unknown });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "BAD_ROOM" }, { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastId: string | null = null;
      let closed = false;

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 心跳
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      try {
        while (!closed) {
          const cur = await getCurrentRound(parsed.data.room);
          if (cur && cur.id !== lastId) {
            lastId = cur.id;
            send({ type: "ROUND", id: cur.id, phase: cur.phase, outcome: cur.outcome ?? null, startedAt: cur.startedAt });
          }
          await new Promise(r => setTimeout(r, 1000)); // 1s 輪詢
        }
      } catch (e) {
        // ignore
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
    cancel() { /* ignore */ },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx
    },
  });
}
