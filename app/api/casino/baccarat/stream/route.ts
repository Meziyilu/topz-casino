// app/api/casino/baccarat/stream/route.ts
import { NextRequest } from "next/server";
import { getRoomInfo } from "services/baccarat.service";
import { z } from "zod";
import { RoomCode } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const roomStr = req.nextUrl.searchParams.get("room");
  const parsed = z.nativeEnum(RoomCode).safeParse(roomStr as any);
  if (!parsed.success) return new Response("BAD_ROOM", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (evt: string, data: any) => {
        controller.enqueue(enc.encode(`event: ${evt}\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 初始
      const first = await getRoomInfo(parsed.data);
      send("ROOM_STATE", first);

      const t = setInterval(async () => {
        try {
          const info = await getRoomInfo(parsed.data);
          send("TICK", { countdown: info.countdown, phase: info.phase, roundId: info.roundId });
        } catch {}
      }, 1000);

      const ping = setInterval(() => controller.enqueue(enc.encode(`: ping\n\n`)), 15000);

      const close = () => {
        clearInterval(t);
        clearInterval(ping);
        controller.close();
      };
      // @ts-ignore
      req.signal?.addEventListener?.("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
