export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'LOBBY';

  // 極簡示例：長輪詢 / 短輪詢可替代；完整可接 Redis pub/sub。
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder(`event: ping\ndata: ok\n\n`));
      let lastId: string | undefined;

      const tick = async () => {
        const rows = await prisma.chatMessage.findMany({
          where: { room, ...(lastId ? { createdAt: { gt: new Date(Date.now() - 60_000) } } : {}) },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });
        for (const r of rows) {
          lastId = r.id;
          controller.enqueue(encoder(`event: message\ndata: ${JSON.stringify(r)}\n\n`));
        }
        setTimeout(tick, 1500);
      };
      tick();
    },
    cancel() {},
  });

  const encoder = (s: string) => new TextEncoder().encode(s);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
