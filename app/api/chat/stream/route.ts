import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const push = (data: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      // 極簡示範：每 5 秒 ping 一次，實務上可配合 DB/Redis pubsub
      const id = setInterval(() => push({ type: 'ping', at: Date.now() }), 5000);
      return () => clearInterval(id as any);
    }
  });
  return new NextResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
}