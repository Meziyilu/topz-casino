// app/casino/roulette/[room]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

export default function RoomPage({ params }: { params: { room: RouletteRoomCode } }) {
  const room = params.room;
  const [state, setState] = useState<{ phase: Phase; msLeft: number; result?: number }>();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 進房就啟動 loop + 讓該房開始循環（server 會避免重覆啟動）
    fetch("/api/casino/roulette/room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    });

    const tick = async () => {
      const res = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" }).then(r => r.json());
      setState(res);
      timerRef.current = window.setTimeout(tick, 800); // 輕量輪詢
    };
    tick();

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
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
  const isBetting = state?.phase === "BETTING";
  const isRevealing = state?.phase === "REVEALING";

  return (
    <div className="room">
      <h1>Roulette — {room}</h1>

      <div className={`phase ${state?.phase ?? ""}`}>
        Phase: {state?.phase ?? "-"} | Left: {sec}s{" "}
        {state?.result != null && state.phase !== "BETTING" && <span>Result: {state.result}</span>}
      </div>

      {/* 轉盤 + 動畫 */}
      <div className="roulette-stage">
        <div className={`wheel ${isRevealing ? "spinning" : ""}`} aria-live="polite">
          <div className="pin" />
          <div className="ring" />
          {/* 結果燈號（揭示時先隱藏，結束再亮） */}
          <div className={`result-bubble ${state?.phase === "SETTLED" ? "show" : ""}`}>
            {state?.result ?? "-"}
          </div>
        </div>

        {/* 開獎動畫層（10s）：閃光/粒子/掃光 */}
        {isRevealing && (
          <div className="reveal-overlay" aria-hidden>
            <div className="flash" />
            <div className="sweep" />
            <div className="sparks" />
            <div className="countdown-bar">
              <div className="fill" />
            </div>
          </div>
        )}
      </div>

      {/* 簡易下注面板（揭示或結算時鎖定按鈕） */}
      <div className="bets">
        <button disabled={!isBetting} onClick={() => bet("RED_BLACK" as RouletteBetKind, 10)}>Red $10</button>
        <button disabled={!isBetting} onClick={() => bet("ODD_EVEN"  as RouletteBetKind, 10)}>Odd $10</button>
        <button disabled={!isBetting} onClick={() => bet("LOW_HIGH"  as RouletteBetKind, 10)}>Low $10</button>
        <button disabled={!isBetting} onClick={() => bet("STRAIGHT"  as RouletteBetKind, 10)}>Straight $10</button>
      </div>

      <style jsx>{`
        .phase {
          padding: 8px 12px; margin: 10px 0 16px; border-radius: 8px;
          transition: background 400ms, box-shadow 400ms;
        }
        .phase.BETTING { background: rgba(0,200,0,.1); box-shadow: 0 0 24px rgba(0,255,0,.2); }
        .phase.REVEALING { background: rgba(200,160,0,.12); box-shadow: 0 0 32px rgba(255,220,0,.35); animation: flash 1.2s infinite; }
        .phase.SETTLED { background: rgba(80,80,80,.12); }

        .roulette-stage {
          position: relative;
          width: min(520px, 90vw);
          height: min(520px, 90vw);
          margin: 0 auto 18px;
        }
        .wheel {
          position: relative;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 50%, #222 0%, #111 60%, #000 100%);
          border: 8px solid #333;
          overflow: hidden;
        }
        .wheel::before {
          content: "";
          position: absolute; inset: -40%;
          background:
            conic-gradient(from 0deg,
              #c00, #222 5deg, #222 10deg,
              #0c0, #222 15deg, #222 20deg,
              #c00, #222 25deg, #222 30deg,
              #0c0, #222 35deg, #222 40deg,
              #c00, #222 45deg, #222 50deg,
              #0c0, #222 55deg, #222 60deg,
              #c00, #222 65deg, #222 70deg,
              #0c0, #222 75deg, #222 80deg,
              #c00, #222 85deg, #222 90deg,
              #0c0, #222 95deg, #222 100deg,
              #c00, #222 105deg, #222 110deg,
              #0c0, #222 115deg, #222 120deg,
              #c00, #222 125deg, #222 130deg,
              #0c0, #222 135deg, #222 140deg,
              #c00, #222 145deg, #222 150deg,
              #0c0, #222 155deg, #222 160deg,
              #c00, #222 165deg, #222 170deg,
              #0c0, #222 175deg, #222 180deg);
          opacity: .9;
          transition: transform .6s cubic-bezier(.2,.8,.2,1);
        }
        .wheel.spinning::before {
          animation: spin 10s cubic-bezier(.2,.8,.2,1) forwards;
        }

        .pin {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent;
          border-bottom: 16px solid #ffd44d; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6));
        }
        .ring {
          position: absolute; inset: 10%;
          border-radius: 50%;
          border: 4px dashed rgba(255,255,255,.15);
        }
        .result-bubble {
          position: absolute; inset: 35% 35%;
          display: grid; place-items: center;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 40%, #333, #111 70%);
          color: #fff; font-weight: 700; font-size: clamp(22px, 6vw, 40px);
          opacity: 0; transform: scale(.6);
          transition: opacity .4s, transform .4s;
          box-shadow: inset 0 0 10px rgba(255,255,255,.06), 0 0 24px rgba(255,255,160,.08);
        }
        .result-bubble.show { opacity: 1; transform: scale(1); }

        .reveal-overlay {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        }
        .flash {
          position: absolute; inset: -5%;
          background: radial-gradient(circle at 50% 50%, rgba(255,240,120,.25), transparent 60%);
          animation: pulse 1.2s ease-in-out infinite;
        }
        .sweep {
          position: absolute; top: 0; bottom: 0; left: -40%;
          width: 40%; transform: skewX(-20deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.32), transparent);
          animation: sweep 2.2s linear infinite;
        }
        .sparks {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle, rgba(255,255,200,.9) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(255,220,120,.7) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(255,255,255,.8) 0 2px, transparent 3px);
          background-size: 6px 6px, 8px 8px, 7px 7px;
          background-position:
            10% 30%, 25% 50%, 40% 20%,
            60% 70%, 75% 35%, 85% 60%;
          opacity: .0; animation: twinkle 2.4s ease-in-out infinite;
        }
        .countdown-bar {
          position: absolute; left: 8%; right: 8%; bottom: 10%;
          height: 6px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden;
        }
        .countdown-bar .fill {
          width: 100%; height: 100%;
          background: linear-gradient(90deg, #ffd766, #ff9b3f);
          transform-origin: left center;
          animation: bar 10s linear forwards;
          filter: drop-shadow(0 0 8px rgba(255,160,0,.6));
        }

        .bets { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
        .bets button { padding: 10px 14px; border-radius: 8px; border: 1px solid #333; cursor: pointer; }
        .bets button[disabled] { opacity: .5; cursor: not-allowed; }

        @keyframes flash { 0% { filter: drop-shadow(0 0 0 rgba(255,255,160,0)); } 50% { filter: drop-shadow(0 0 12px rgba(255,255,200,.9)); } 100% { filter: drop-shadow(0 0 0 rgba(255,255,160,0)); } }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(1440deg); } } /* 任意 1440=4圈，可自行調整 */
        @keyframes pulse { 0%,100% { opacity:.2 } 50% { opacity:.45 } }
        @keyframes sweep { from { transform: translateX(0) skewX(-20deg);} to { transform: translateX(180%) skewX(-20deg);} }
        @keyframes twinkle { 0%,100% { opacity: .0; } 50% { opacity: .45; } }
        @keyframes bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }

        @media (prefers-reduced-motion: reduce) {
          .wheel.spinning::before,
          .flash, .sweep, .sparks, .countdown-bar .fill { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
