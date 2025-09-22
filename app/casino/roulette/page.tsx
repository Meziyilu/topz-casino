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
    const j: StateResp = await r.json();
    setStates((s) => ({ ...s, [room]: j }));
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
    <div className="rlb-wrap">
      <header className="rlb-head">
        <h1>Roulette Lobby</h1>
        <p className="rlb-muted">選擇一個房間進入下注</p>
      </header>

      <section className="rlb-grid">
        {ROOMS.map((r) => {
          const st = states[r.code];
          const ov = overviews[r.code];
          const phase = st?.round.phase ?? "-";
          const lock = st?.timers.lockInSec ?? 0;
          const end = st?.timers.endInSec ?? 0;
          const res = st?.round.result ?? "-";

          return (
            <Link key={r.code} href={`/casino/roulette/rooms/${r.code}`} className="rlb-card glass">
              <div className={`rlb-badge ${String(phase).toLowerCase()}`}>{phase}</div>

              <div className="rlb-wheel">
                <div className="pin" />
                <div className="result">{res}</div>
              </div>

              <h3 className="title">{r.label}</h3>
              <p className="desc">{r.desc}</p>

              <div className="stats">
                <span>Bet close in <b>{lock}</b>s</span>
                <span>Settle in <b>{end}</b>s</span>
              </div>

              <div className="overview">
                <div className="ov"><div className="ov-k">我本局</div><div className="ov-v">${ov?.myTotal ?? 0}</div></div>
                <div className="ov"><div className="ov-k">投注量</div><div className="ov-v">${ov?.totalAmount ?? 0}</div></div>
                <div className="ov"><div className="ov-k">筆數</div><div className="ov-v">{ov?.totalBets ?? 0}</div></div>
                <div className="ov"><div className="ov-k">人數</div><div className="ov-v">{ov?.uniqueUsers ?? 0}</div></div>
              </div>
            </Link>
          );
        })}
      </section>

      <style jsx global>{`
        .rlb-wrap { padding:20px; }
        .rlb-head { margin-bottom:16px; }
        .rlb-muted { opacity:.7; font-weight:400; }
        .rlb-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; }

        .glass {
          background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
          backdrop-filter: blur(10px);
        }

        .rlb-card { padding:16px; border-radius:12px; color:inherit; position:relative; display:grid; gap:8px; }
        .rlb-card:hover { background:rgba(255,255,255,.05); }

        .rlb-badge { position:absolute; top:10px; left:10px; padding:4px 8px; border-radius:999px; font-size:12px; }
        .rlb-badge.betting { color:#26d37d; }
        .rlb-badge.revealing { color:#ffd34d; animation:glow 1.2s infinite; }
        .rlb-badge.settled { color:#aab; }
        @keyframes glow { 50% { text-shadow:0 0 12px rgba(255,240,120,.9); } }

        .rlb-wheel { height:140px; display:grid; place-items:center; position:relative; }
        .rlb-wheel .result { font-weight:700; letter-spacing:.5px; opacity:.9; }

        .title { margin-top:6px; font-weight:700; }
        .desc { opacity:.85; font-size:13px; }
        .stats { display:flex; gap:12px; font-size:13px; opacity:.9; }
        .overview { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:4px; }
        .ov-k { font-size:12px; opacity:.8; }
        .ov-v { font-weight:700; }
      `}</style>
    </div>
  );
}
