export const runtime="nodejs"; export const dynamic="force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { getRoomConfig, setRoomConfig } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const gate = await requireAdmin(req); if (!gate) return Response.json({ error:"UNAUTH" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "rooms";

  if (action==="rooms") {
    const codes: RoomCode[] = ["R30","R60","R90"] as any;
    const items = await Promise.all(codes.map(async c => ({ code: c, config: await getRoomConfig(c) })));
    return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
  }

  if (action==="config.get") {
    const room = (searchParams.get("room") as RoomCode) || "R60";
    return Response.json({ room, config: await getRoomConfig(room) }, { headers:{ "Cache-Control":"no-store" }});
  }

  return Response.json({ error:"BAD_ACTION" }, { status:400 });
}

export async function POST(req: Request){
  const gate = await requireAdmin(req); if (!gate) return Response.json({ error:"UNAUTH" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  const body = await req.json().catch(()=> ({})) as any;

  if (action==="open" || action==="close") {
    const room = (body?.room || "R60") as RoomCode;
    const cfg = await setRoomConfig(room, { enabled: action==="open" });
    return Response.json({ ok:true, room, enabled: cfg.enabled });
  }

  if (action==="config.put") {
    const room = (body?.room || "R60") as RoomCode;
    const merged = await setRoomConfig(room, {
      payouts: body?.payouts,
      minBet: body?.minBet, maxBet: body?.maxBet,
      durationSeconds: body?.durationSeconds, lockBeforeRevealSec: body?.lockBeforeRevealSec,
      enabled: body?.enabled,
    });
    return Response.json({ ok:true, room, config: merged });
  }

  return Response.json({ error:"BAD_ACTION" }, { status:400 });
}
