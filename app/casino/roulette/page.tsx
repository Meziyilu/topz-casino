"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Room = "RL_R30" | "RL_R60" | "RL_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; result: number | null };
  timers: { lockInSec: number; endInSec: number; revealWindowSec: number };
  locked: boolean;
};

type Overview = {
  room: Room;
  roundId: string;
  myTotal: number;
  totalAmount: number;
  totalBets: number;
  uniqueUsers: number;
  msLeft?: number;
};

const ROOMS: { code: Room; label: string; desc: string }[] = [
  { code: "RL_R30", label: "R30", desc: "30s 投注 + 10s 揭示" },
  { code: "RL_R60", label: "R60", desc: "同步節奏（示例）" },
  { code: "RL_R90", label: "R90", desc: "同步節奏（示例）" },
];

export default function RouletteLobby() {
  const [states, setStates] = useState<Record<Room, StateResp | null>>({
    RL_R30: null,
    RL_R60: null,
    RL_R90: null,
  });
  const [overviews, setOverviews] = useState<Record<Room, Overview | null>>({
    RL_R30: null,
    RL_R60: null,
    RL_R90: null,
  });

  async function pullState(room: Room) {
    const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
    if (!r.ok) return;
    const j: StateResp = await r.json();                   // 先 await
    setStates((s) => ({ ...s, [room]: j }));               // 再 setState
  }

  async function pullOverview(room: Room) {
    const r = await fetch(`/api/casino/roulette/overview?room=${room}`, { cache: "no-store" });
    if (!r.ok) return;
    const j: Overview = await r.json();
    setOverviews((s) => ({ ...s, [room]: j }));
  }

  useEffect(() => {
    ROOMS.forEach((r) => {
      pullState(r.code);
      pullOverview(r.code);
    });
    const t = setInterval(() => {
      ROOMS.forEach((r) => pullState(r.code));
      ROOMS.forEach((r) => pullOverview(r.code));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rlb-wrap" style={{ padding: 20 }}>
      <header className="rlb-head">
        <h1>Roulette Lobby</h1>
        <p className="muted">選擇一個房間進入下注</p>
      </header>

      <section className="rlb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {ROOMS.map((r) => {
          const st = states[r.code];
          const ov = overviews[r.code];
          const phase = st?.round.phase ?? "-";
          const lock = st?.timers.lockInSec ?? 0;
          const end = st?.timers.endInSec ?? 0;
          const res = st?.round.result ?? "-";

          return (
            <Link key={r.code} href={`/casino/roulette/rooms/${r.code}`} className="rlb-card glass"
              style={{ padding: 16, borderRadius: 12, textDecoration: "none", color: "inherit" }}>
              <div className={`badge ${String(phase).toLowerCase()}`}>{phase}</div>

              <div className="wheel" style={{ height: 140, display: "grid", placeItems: "center" }}>
                <div className="pin" />
                <div className={`result`}>{res}</div>
              </div>

              <h3 className="title" style={{ marginTop: 6 }}>{r.label}</h3>
              <p className="desc">{r.desc}</p>

              <div className="stats" style={{ display: "flex", gap: 12 }}>
                <span>Bet close in <b>{lock}</b>s</span>
                <span>Settle in <b>{end}</b>s</span>
              </div>

              <div className="overview" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 8 }}>
                <div className="ov">
                  <div className="ov-k">我本局</div>
                  <div className="ov-v">${ov?.myTotal ?? 0}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">投注量</div>
                  <div className="ov-v">${ov?.totalAmount ?? 0}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">筆數</div>
                  <div className="ov-v">{ov?.totalBets ?? 0}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">人數</div>
                  <div className="ov-v">{ov?.uniqueUsers ?? 0}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
