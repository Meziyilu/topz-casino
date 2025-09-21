// app/casino/roulette/[room]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { RouletteRoomCode, RouletteBetKind } from "@prisma/client";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

// 可能的 /state 精簡版
type StateCompact = {
  phase: Phase | string;
  msLeft: number;
  result?: number | null;
};

// 可能的 /state 完整版
type StateFull = {
  room: RouletteRoomCode;
  round: { id: string; phase: Phase; startedAt: string; result: number | null };
  timers:
    | { lockInSec: number; endInSec: number; revealWindowSec: number }
    | { lockMs?: number; endMs?: number; now?: number };
  locked: boolean;
};

type StateAny = StateCompact | StateFull;

function toInt(n: unknown, fallback = 0) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : fallback;
}

function parseMsLeft(resp: StateAny): { phase: Phase; msLeft: number; result: number | null } {
  // 精簡版
  if ("msLeft" in resp && "phase" in resp) {
    const phase = String(resp.phase).toUpperCase() as Phase;
    return { phase, msLeft: toInt(resp.msLeft), result: (resp as StateCompact).result ?? null };
  }
  // 完整版
  const f = resp as StateFull;
  const phase = f.round?.phase ?? "BETTING";
  const result = f.round?.result ?? null;

  // 轉成 msLeft：優先 end 秒；若還未到封盤，用 lock 秒
  if ("lockInSec" in f.timers && "endInSec" in f.timers) {
    const lockMs = toInt(f.timers.lockInSec) * 1000;
    const endMs = toInt(f.timers.endInSec) * 1000;
    // 若已封盤則顯示距離結算，否則顯示距離封盤
    const msLeft = phase === "BETTING" ? lockMs : endMs;
    return { phase, msLeft, result };
  }
  // 毫秒制
  const lockMs =
    (f.timers as any).lockMs ??
    (f.timers as any).msToLock ??
    (f.timers as any).ms_left_lock ??
    0;
  const endMs =
    (f.timers as any).endMs ??
    (f.timers as any).msToEnd ??
    (f.timers as any).ms_left_end ??
    0;

  const msLeft = phase === "BETTING" ? toInt(lockMs) : toInt(endMs);
  return { phase, msLeft, result };
}

export default function RoomPage({ params }: { params: { room: RouletteRoomCode } }) {
  const room = params.room;
  const [phase, setPhase] = useState<Phase>("BETTING");
  const [msLeft, setMsLeft] = useState<number>(0);
  const [result, setResult] = useState<number | null>(null);

  // 輪詢與本地倒數控制
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 進房：觸發開盤循環
  useEffect(() => {
    fetch("/api/casino/roulette/room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ room }),
    }).catch(() => { /* ignore */ });
  }, [room]);

  // 取一次狀態
  async function pull() {
    try {
      const res = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
      if (!res.ok) throw new Error("STATE_FAIL");
      const j: StateAny = await res.json();
      const p = parseMsLeft(j);
      setPhase(p.phase);
      setMsLeft(p.msLeft);
      setResult(p.result);
    } catch {
      // ignore（保留現有顯示）
    }
  }

  // 啟動輪詢 + 本地倒數
  useEffect(() => {
    pull(); // 立即一次
    if (!pollRef.current) {
      pollRef.current = setInterval(() => pull(), 5000); // 每 5 秒校正一次
    }
    if (!tickRef.current) {
      tickRef.current = setInterval(() => {
        setMsLeft((m) => (m > 0 ? m - 1000 : 0));
      }, 1000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      pollRef.current = null;
      tickRef.current = null;
    };
  }, [room]);

  async function bet(kind: RouletteBetKind, amount: number) {
    try {
      // 只有下注期可下、且還有剩餘時間
      if (phase !== "BETTING" || msLeft <= 0) {
        alert("現在不可下注（非投注期或已封盤）");
        return;
      }
      const r = await fetch(`/api/casino/roulette/bet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, kind, amount }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "BET_FAIL");
    } catch (e: any) {
      alert(e?.message ?? "BET_FAIL");
    }
  }

  const sec = Math.ceil(msLeft / 1000);

  return (
    <div className="room">
      <h1>Roulette — {room}</h1>

      <div className={`phase ${phase}`}>
        Phase: {phase} | Left: {sec}s{" "}
        {result != null && phase !== "BETTING" && <span>Result: {result}</span>}
      </div>

      {/* 簡易下注面板（可換完整盤面與動畫） */}
      <div className="bets">
        <button disabled={phase !== "BETTING" || sec <= 0} onClick={() => bet("RED_BLACK", 10 as RouletteBetKind & number as any)}>
          Red $10
        </button>
        <button disabled={phase !== "BETTING" || sec <= 0} onClick={() => bet("ODD_EVEN", 10 as RouletteBetKind & number as any)}>
          Odd $10
        </button>
        <button disabled={phase !== "BETTING" || sec <= 0} onClick={() => bet("LOW_HIGH", 10 as RouletteBetKind & number as any)}>
          Low $10
        </button>
        <button disabled={phase !== "BETTING" || sec <= 0} onClick={() => bet("STRAIGHT", 10 as RouletteBetKind & number as any)}>
          Straight $10
        </button>
      </div>

      <style jsx>{`
        .phase {
          padding: 8px 12px;
          margin: 10px 0;
          border-radius: 8px;
          transition: background 400ms, box-shadow 400ms;
        }
        .phase.BETTING {
          background: rgba(0, 200, 0, 0.1);
          box-shadow: 0 0 24px rgba(0, 255, 0, 0.2);
        }
        .phase.REVEALING {
          background: rgba(200, 160, 0, 0.12);
          box-shadow: 0 0 32px rgba(255, 220, 0, 0.35);
          animation: flash 1.2s infinite;
        }
        .phase.SETTLED {
          background: rgba(80, 80, 80, 0.12);
        }
        @keyframes flash {
          0% {
            filter: drop-shadow(0 0 0px rgba(255, 255, 160, 0));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(255, 255, 200, 0.8));
          }
          100% {
            filter: drop-shadow(0 0 0px rgba(255, 255, 160, 0));
          }
        }
        .bets {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .bets button {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #333;
          cursor: pointer;
        }
        .bets button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
