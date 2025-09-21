"use client";

import { useEffect, useState } from "react";
import s from "./page.module.css";

type Room = "RL_R30" | "RL_R60" | "RL_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; result: number | null };
  timers: { lockInSec: number; endInSec: number; revealWindowSec: number };
};

const ROOMS: Room[] = ["RL_R30", "RL_R60", "RL_R90"];

export default function AdminRoulette() {
  const [data, setData] = useState<Record<Room, StateResp | null>>({
    RL_R30: null, RL_R60: null, RL_R90: null,
  });

  async function refresh(room: Room) {
    const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
    if (!r.ok) return;
    setData((d) => ({ ...d, [room]: await r.json() }));
  }

  async function start(room: Room) {
    await fetch("/api/casino/roulette/room/start", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ room })
    });
    refresh(room);
  }

  async function settle(room: Room) {
    const roundId = data[room]?.round.id;
    if (!roundId) return alert("沒有進行中的局");
    const input = prompt("輸入開獎號（0~36）：");
    const n = Number(input);
    if (!(n >= 0 && n <= 36)) return;
    const r = await fetch("/api/casino/roulette/admin/settle", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ roundId, result: n })
    }).then(r => r.json());
    if (!r.ok) alert(r.error ?? "SETTLE_FAIL");
    refresh(room);
  }

  useEffect(() => {
    ROOMS.forEach(refresh);
    const t = setInterval(() => ROOMS.forEach(refresh), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className={s.wrap}>
      <h1>輪盤管理</h1>
      <section className={s.grid}>
        {ROOMS.map((room) => {
          const it = data[room];
          return (
            <div key={room} className={s.card}>
              <h3>{room}</h3>
              <div className={s.row}><span>狀態：</span><b>{it?.round.phase ?? "-"}</b></div>
              <div className={s.row}><span>Round：</span><span className={s.mono}>{it?.round.id ?? "-"}</span></div>
              <div className={s.row}><span>Result：</span><b>{it?.round.result ?? "-"}</b></div>
              <div className={s.row}><span>Lock：</span><b>{it?.timers.lockInSec ?? 0}s</b></div>
              <div className={s.row}><span>End：</span><b>{it?.timers.endInSec ?? 0}s</b></div>
              <div className={s.row} style={{gap:10, marginTop:8}}>
                <button className={s.btn} onClick={() => start(room)}>啟動/續跑</button>
                <button className={s.btn} onClick={() => settle(room)}>手動結算</button>
                <button className={s.btn} onClick={() => refresh(room)}>刷新</button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
