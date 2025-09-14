import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE 推播百家樂狀態
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room") as "R30" | "R60" | "R90";

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        async function pushState() {
          const r = await prisma.round.findFirst({
            where: { room },
            orderBy: { startedAt: "desc" },
          });
          if (r) {
            const payload = {
              id: r.id,
              seq: r.seq,
              phase: r.phase,
              startedAt: r.startedAt.toISOString(),
              endsAt: r.endsAt.toISOString(),
              outcome: r.outcome,
              result: r.resultJson ? JSON.parse(r.resultJson) : null,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
        }

        // 推一次立即狀態
        await pushState();

        // 每 3 秒推一次
        const interval = setInterval(pushState, 3000);
        req.signal.addEventListener("abort", () => clearInterval(interval));
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}
