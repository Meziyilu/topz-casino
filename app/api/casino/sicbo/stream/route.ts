export const runtime="nodejs"; export const dynamic="force-dynamic"; export const revalidate=0;
import { ensureRooms, subscribeRoom } from "@/lib/sicbo/room";

export async function GET(req:Request){
  await ensureRooms();
  const { searchParams } = new URL(req.url);
  const room = (searchParams.get("room")||"R60") as "R30"|"R60"|"R90";
  const stream = new ReadableStream({
    start(controller){
      const send=(t:string,d:any)=>{
        controller.enqueue(new TextEncoder().encode(`event: ${t}\n`));
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(d)}\n\n`));
      };
      const off1=subscribeRoom(room,"tick",(d)=>send("tick",d));
      const off2=subscribeRoom(room,"state",(d)=>send("state",d));
      const off3=subscribeRoom(room,"result",(d)=>send("result",d));
      (controller as any)._cleanup=()=>{off1();off2();off3();};
    },
    cancel(){ (this as any)._cleanup?.(); }
  });
  return new Response(stream,{ headers:{ "Content-Type":"text/event-stream","Cache-Control":"no-cache" }});
}
