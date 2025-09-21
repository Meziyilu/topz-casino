"use client";

import { useEffect, useState } from "react";

type Room = "RL_R30" | "RL_R60" | "RL_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; result: number | null };
  timers: { lockInSec: number; endInSec: number; revealWindowSec: number };
  locked: boolean;
};

export default function AdminRoulettePage() {
  const [data, setData] = useState<Record<Room, StateResp | null>>({
    RL_R30: null,
    RL_R60: null,
    RL_R90: null,
  });
  const [busy, setBusy] = useState<Record<Room, boolean>>({
    RL_R30: false,
    RL_R60: false,
    RL_R90: false,
  });

  async function refresh(room: Room) {
    const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
    if (!r.ok) return;
    const j: StateResp = await r.json();               // 先 await
    setData((d) => ({ ...d, [room]: j }));             // 再 setState
  }

  async function start(room: Room) {
    try {
      setBusy((b) => ({ ...b, [room]: true }));
      await fetch(`/api/casino/roulette/room/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room }),
      });
      await refresh(room);
    } finally {
      setBusy((b) => ({ ...b, [room]: false }));
    }
  }

  useEffect(() => {
    (["RL_R30", "RL_R60", "RL_R90"] as Room[]).forEach(refresh);
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>輪盤管理</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {(["RL_R30", "RL_R60", "RL_R90"] as Room[]).map((room) => {
          const st = data[room];
          return (
            <div key={room} className="glass" style={{ padding: 16, borderRadius: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div><b>房間：</b>{room}</div>
                <button disabled={busy[room]} onClick={() => start(room)}>
                  {busy[room] ? "啟動中…" : "啟動/續跑"}
                </button>
              </div>
              {st ? (
                <>
                  <div>局號：{st.round.id}</div>
                  <div>階段：{st.round.phase}</div>
                  <div>結果：{st.round.result ?? "-"}</div>
                  <div>封盤還有：{st.timers.lockInSec}s</div>
                  <div>結算還有：{st.timers.endInSec}s</div>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => refresh(room)}>刷新</button>
                  </div>
                </>
              ) : (
                <div>尚無狀態，請按「啟動/續跑」</div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
