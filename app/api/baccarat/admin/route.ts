export const runtime="nodejs"; export const dynamic="force-dynamic";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureRoom, getRoomConfig, setRoomConfig } from "@/services/baccarat.service";
import type { RoomCode } from "@prisma/client";

export async function GET(req: Request){
  const gate = await requireAdmin(req); if (!gate) return Response.json({ error:"UNAUTH" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "rooms";

  if (action==="rooms") {
    const rooms = await prisma.room.findMany({ orderBy:{ code:"asc" } });
    const out = await Promise.all(rooms.map(async r => ({ ...r, config: await getRoomConfig(r.code as RoomCode) })));
    return Response.json({ items: out }, { headers:{ "Cache-Control":"no-store" }});
  }
  if (action==="config.get") {
    const room = (searchParams.get("room") as RoomCode) || "R60";
    const cfg = await getRoomConfig(room);
    return Response.json({ room, config: cfg }, { headers:{ "Cache-Control":"no-store" }});
  }
  if (action==="rounds") {
    const room = (searchParams.get("room") as RoomCode) || "R60";
    const day = searchParams.get("day"); // YYYY-MM-DD
    const r = await ensureRoom(room);
    const base = day ? new Date(`${day}T00:00:00.000Z`) : undefined;
    const items = await prisma.round.findMany({
      where:{ roomId: r.id, ...(base ? { day: base } : {}) },
      orderBy:{ roundSeq:"asc" },
      select:{ id:true, roundSeq:true, phase:true, payoutSettled:true, outcome:true, playerTotal:true, bankerTotal:true, playerPair:true, bankerPair:true, settledAt:true }
    });
    return Response.json({ items }, { headers:{ "Cache-Control":"no-store" }});
  }

  return Response.json({ error:"BAD_ACTION" }, { status:400 });
}

export async function POST(req: Request){
  const gate = await requireAdmin(req); if (!gate) return Response.json({ error:"UNAUTH" }, { status:401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  const body = await req.json().catch(()=> ({})) as any;

  if (action==="open") {
    const room = (body?.room || "R60") as RoomCode;
    const r = await prisma.room.update({ where:{ code: room }, data:{ enabled:true }});
    return Response.json({ ok:true, room: r.code, enabled: r.enabled });
  }
  if (action==="close") {
    const room = (body?.room || "R60") as RoomCode;
    const r = await prisma.room.update({ where:{ code: room }, data:{ enabled:false }});
    return Response.json({ ok:true, room: r.code, enabled: r.enabled });
  }
  if (action==="config.put") {
    const room = (body?.room || "R60") as RoomCode;
    const merged = await setRoomConfig(room, {
      payouts: body?.payouts, minBet: body?.minBet, maxBet: body?.maxBet,
      durationSeconds: body?.durationSeconds, lockBeforeRevealSec: body?.lockBeforeRevealSec
    });
    if (body?.name) await prisma.room.update({ where:{ code: room }, data:{ name: body.name }});
    return Response.json({ ok:true, room, config: merged });
  }

  return Response.json({ error:"BAD_ACTION" }, { status:400 });
}
