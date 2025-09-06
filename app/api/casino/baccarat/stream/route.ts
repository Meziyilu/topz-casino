// app/api/casino/baccarat/stream/route.ts
import { NextResponse } from "next/server";
import { getRoomInfo } from "@/services/baccarat.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 簡化版：這裡用 SSE，可以替換成 WebSocket
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");
  if (!room) return NextResponse.json({ ok: false, error: "NO_ROOM" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ping\ndata: hello\n\n`));

      // 每 3 秒推送一次房間狀態（模擬）
      const interval = setInterval(async () => {
        const info = await getRoomInfo(room);
        controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify(info)}\n\n`));
      }, 3000);

      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
