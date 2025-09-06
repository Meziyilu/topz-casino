import { NextRequest } from "next/server";
import { z } from "zod";
import { RoomCode } from "@prisma/client";
import { streamRoom } from "@/services/baccarat.service";

// SSE：回傳的是 ReadableStream，框架會自動設置 Content-Type
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const schema = z.object({ room: z.nativeEnum(RoomCode) });
  const parsed = schema.safeParse({ room: sp.get("room") as any });
  if (!parsed.success) {
    return new Response('{"ok":false,"error":"BAD_ROOM"}', {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 假設 service 會回傳 { stream: ReadableStream }
  const { stream } = await streamRoom(parsed.data.room);
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
