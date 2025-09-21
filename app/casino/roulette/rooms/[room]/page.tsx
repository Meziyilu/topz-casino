// app/casino/roulette/[room]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";

export default function RoomPage({ params }: { params: { room: RouletteRoomCode } }) {
  const room = params.room;
  const [state, setState] = useState<{ phase: string; msLeft: number; result?: number }>();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 進房就啟動 loop
    fetch("/api/casino/roulette/room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    });

    const tick = async () => {
      const res = await fetch(`/api/casino/roulette/state?room=${room}`).then(r => r.json());
      setState(res);
      timerRef.current = window.setTimeout(tick, 800); // 輕量輪詢
    };
    tick();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [room]);

  async function bet(kind: RouletteBetKind, amount: number) {
    const res = await fetch(`/api/casino/roulette/bet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room, kind, amount }),
    }).then(r => r.json());
    if (!res.ok) alert(res.error ?? "BET_FAIL");
  }

  const sec = Math.ceil((state?.msLeft ?? 0) / 1000);

  return (
    <div className="room">
      <h1>Roulette — {room}</h1>
      <div className={`phase ${state?.phase ?? ""}`}>
        Phase: {state?.phase ?? "-"} | Left: {sec}s {state?.result != null && <span>Result: {state.result}</span>}
      </div>

      {/* 簡單下注面板（你可換成完整 UI + 動畫） */}
      <div className="bets">
        <button onClick={() => bet("RED_BLACK" as RouletteBetKind, 10)}>Red $10</button>
        <button onClick={() => bet("ODD_EVEN"  as RouletteBetKind, 10)}>Odd $10</button>
        <button onClick={() => bet("LOW_HIGH"  as RouletteBetKind, 10)}>Low $10</button>
        <button onClick={() => bet("STRAIGHT"  as RouletteBetKind, 10)}>Straight $10</button>
      </div>

      <style jsx>{`
        .phase {
          padding: 8px 12px; margin: 10px 0; border-radius: 8px;
          transition: background 400ms, box-shadow 400ms;
        }
        .phase.BETTING { background: rgba(0,200,0,.1); box-shadow: 0 0 24px rgba(0,255,0,.2); }
        .phase.REVEALING { background: rgba(200,160,0,.12); box-shadow: 0 0 32px rgba(255,220,0,.35); animation: flash 1.2s infinite; }
        .phase.SETTLED { background: rgba(80,80,80,.12); }
        @keyframes flash {
          0% { filter: drop-shadow(0 0 0px rgba(255,255,160,.0)); }
          50% { filter: drop-shadow(0 0 12px rgba(255,255,200,.8)); }
          100% { filter: drop-shadow(0 0 0px rgba(255,255,160,.0)); }
        }
        .bets { display:flex; gap:8px; flex-wrap:wrap; }
        .bets button { padding: 10px 14px; border-radius: 8px; border: 1px solid #333; cursor: pointer; }
      `}</style>
    </div>
  );
}
