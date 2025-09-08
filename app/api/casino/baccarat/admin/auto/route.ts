import { NextRequest, NextResponse } from "next/server";
import type { BetSide, RoomCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoomInfo, getCurrentRound, settleRound } from "@/services/baccarat.service";

function assertAdmin(req: NextRequest) {
  const env = process.env.ADMIN_TOKEN?.trim();
  const fromHeader = req.headers.get("x-admin-token")?.trim();
  const fromQuery = new URL(req.url).searchParams.get("token")?.trim();
  if (!env) return;
  if (fromHeader !== env && fromQuery !== env) throw new Error("UNAUTHORIZED");
}

function pickOutcome(): "PLAYER" | "BANKER" | "TIE" {
  const r = Math.random();
  if (r < 0.456) return "BANKER";
  if (r < 0.456 + 0.446) return "PLAYER";
  return "TIE";
}
function genPoints(outcome: "PLAYER" | "BANKER" | "TIE") {
  let p = Math.floor(Math.random() * 10);
  let b = Math.floor(Math.random() * 10);
  if (outcome === "PLAYER") { if (p <= b) p = (b + 1) % 10; }
  else if (outcome === "BANKER") { if (b <= p) b = (p + 1) % 10; }
  else { b = p; }
  return { p, b };
}

const REVEAL_SECONDS = 2;
const GRACE_SECONDS = 1;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertAdmin(req);
    const url = new URL(req.url);
    const room = (url.searchParams.get("room") || "R30").toUpperCase() as RoomCode;
    const info = await getRoomInfo(room);
    const secs = info.secondsPerRound || 60;
    const now = new Date();

    let cur = await getCurrentRound(room);

    // 沒回合 → 開局
    if (!cur) {
      const created = await prisma.round.create({
        data: { room, phase: "BETTING", startedAt: now, endsAt: new Date(now.getTime() + secs * 1000) } as any,
        select: { id: true },
      });
      return NextResponse.json({ ok: true, action: "STARTED", id: created.id });
    }

    if (cur.phase === "BETTING") {
      const endsAt: Date =
        (cur as any).endsAt instanceof Date ? (cur as any).endsAt : new Date(cur.startedAt.getTime() + secs * 1000);
      if (now >= endsAt) {
        const outcome = pickOutcome();
        const { p, b } = genPoints(outcome);
        await prisma.round.update({
          where: { id: cur.id },
          data: {
            phase: REVEAL_SECONDS > 0 ? "REVEALING" : "SETTLED",
            outcome: REVEAL_SECONDS > 0 ? null : outcome,
            playerPoint: p as any,
            bankerPoint: b as any,
          } as any,
        });

        if (REVEAL_SECONDS === 0) {
          const payoutMap: Record<BetSide, number> = {
            PLAYER: 1, BANKER: 1, TIE: 8,
            PLAYER_PAIR: 0, BANKER_PAIR: 0, ANY_PAIR: 0, PERFECT_PAIR: 0, BANKER_SUPER_SIX: 0,
          } as any;
          await settleRound(cur.id, outcome, payoutMap);
          const t = new Date(Date.now() + GRACE_SECONDS * 1000);
          const next = await prisma.round.create({
            data: { room, phase: "BETTING", startedAt: t, endsAt: new Date(t.getTime() + secs * 1000) } as any,
            select: { id: true },
          });
          return NextResponse.json({ ok: true, action: "SETTLED_NEXT_STARTED", settledId: cur.id, nextId: next.id, outcome, p, b });
        }
        return NextResponse.json({ ok: true, action: "REVEALING", id: cur.id });
      }
      const left = Math.ceil( ( ((cur as any).endsAt instanceof Date ? (cur as any).endsAt : new Date(cur.startedAt.getTime()+secs*1000)).getTime() - now.getTime()) / 1000 );
      return NextResponse.json({ ok: true, action: "BETTING_WAIT", id: cur.id, secLeft: left });
    }

    if (cur.phase === "REVEALING") {
      const revealUntil = new Date(cur.startedAt.getTime() + (secs + REVEAL_SECONDS) * 1000);
      if (now >= revealUntil) {
        const outcome = (cur as any).outcome ?? pickOutcome();
        const { p, b } = genPoints(outcome);
        await prisma.round.update({
          where: { id: cur.id },
          data: {
            outcome,
            playerPoint: (cur as any).playerPoint ?? (p as any),
            bankerPoint: (cur as any).bankerPoint ?? (b as any),
            phase: "SETTLED",
          } as any,
        });
        const payoutMap: Record<BetSide, number> = {
          PLAYER: 1, BANKER: 1, TIE: 8,
          PLAYER_PAIR: 0, BANKER_PAIR: 0, ANY_PAIR: 0, PERFECT_PAIR: 0, BANKER_SUPER_SIX: 0,
        } as any;
        await settleRound(cur.id, outcome, payoutMap);

        const t = new Date(Date.now() + GRACE_SECONDS * 1000);
        const next = await prisma.round.create({
          data: { room, phase: "BETTING", startedAt: t, endsAt: new Date(t.getTime() + secs * 1000) } as any,
          select: { id: true },
        });
        return NextResponse.json({ ok: true, action: "REVEALING_SETTLED_NEXT", settledId: cur.id, nextId: next.id, outcome, p, b });
      }
      return NextResponse.json({ ok: true, action: "REVEALING_WAIT", id: cur.id });
    }

    if (cur.phase === "SETTLED") {
      const t = new Date(Date.now() + GRACE_SECONDS * 1000);
      const next = await prisma.round.create({
        data: { room, phase: "BETTING", startedAt: t, endsAt: new Date(t.getTime() + secs * 1000) } as any,
        select: { id: true },
      });
      return NextResponse.json({ ok: true, action: "NEXT_STARTED", nextId: next.id });
    }

    return NextResponse.json({ ok: true, action: "UNKNOWN_PHASE", id: cur.id, phase: cur.phase });
  } catch (e: any) {
    const msg = e?.message || "SERVER_ERROR";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 500 });
  }
}
