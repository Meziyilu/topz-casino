export const runtime="nodejs"; export const revalidate=0; export const dynamic="force-dynamic";
import { subscribeRoom, ensureRooms } from "@/lib/sicbo/room";

export async function GET(req: Request){
  await ensureRooms();
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room") || "R60") as "R30"|"R60"|"R90";

  const stream = new ReadableStream({
    start(controller) {
      const send = (event:string, data:any)=>{
        controller.enqueue(new TextEncoder().encode(`event: ${event}\n`));
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const offTick = subscribeRoom(room, "tick", (d)=> send("tick", d));
      const offState= subscribeRoom(room, "state",(d)=> send("state", d));
      const offExp  = subscribeRoom(room, "exposure",(d)=> send("exposure", d));
      const offRes  = subscribeRoom(room, "result",(d)=> send("result", d));
      const hb = setInterval(()=> send("ping", { t: Date.now() }), 15000);
      (controller as any)._cleanup = ()=>{ offTick(); offState(); offExp(); offRes(); clearInterval(hb); };
    },
    cancel() { (this as any)._cleanup?.(); }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }});
}
