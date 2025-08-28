"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type RoomState = {
  room: { code: string; name: string; durationSeconds: number };
  roundSeq: number;
  phase: "BETTING" | "DEALING" | "SETTLED";
  secLeft: number;
  result?: {
    playerTotal: number;
    bankerTotal: number;
    outcome: string;
  } | null;
  myBets?: Record<string, number>;
};

export default function BaccaratRoomPage() {
  const { room } = useParams<{ room: string }>();
  const [state, setState] = useState<RoomState | null>(null);

  useEffect(() => {
    if (!room) return;
    let timer: NodeJS.Timeout;
    async function fetchState() {
      const res = await fetch(`/api/casino/baccarat/state?room=${room}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    }
    fetchState();
    timer = setInterval(fetchState, 1000);
    return () => clearInterval(timer);
  }, [room]);

  if (!state) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-lg opacity-70">載入中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <header className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-wide">
            百家樂 {state.room.name}
          </h1>
          <div className="opacity-70 text-sm">局號 #{state.roundSeq}</div>
        </div>
        <a
          href="/casino"
          className="badge hover:brightness-110"
        >
          返回大廳
        </a>
      </header>

      {/* 狀態區 */}
      <section className="max-w-5xl mx-auto glass-strong neon rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg">
            {state.phase === "BETTING" && "下注中"}
            {state.phase === "DEALING" && "開牌中"}
            {state.phase === "SETTLED" && "已結算"}
          </div>
          <div className="text-sm opacity-80">
            倒數：<span className="font-semibold">{state.secLeft}s</span>
          </div>
        </div>

        {/* 倒數條 */}
        <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-1000"
            style={{
              width: `${Math.max(
                0,
                (state.secLeft / state.room.durationSeconds) * 100
              )}%`,
            }}
          />
        </div>

        {/* 結果 / 開牌動畫 */}
        {state.phase !== "BETTING" && state.result && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <div className="opacity-70 text-sm">PLAYER</div>
              <div className="text-3xl font-bold">{state.result.playerTotal}</div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="opacity-70 text-sm">BANKER</div>
              <div className="text-3xl font-bold">{state.result.bankerTotal}</div>
            </div>
          </div>
        )}

        {state.phase === "SETTLED" && state.result && (
          <div className="mt-2 text-center text-lg font-extrabold">
            結果：{state.result.outcome}
          </div>
        )}
      </section>

      {/* 我的投注 */}
      <section className="max-w-5xl mx-auto glass rounded-2xl p-6">
        <h2 className="font-bold mb-3">我的投注</h2>
        {state.myBets && Object.keys(state.myBets).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(state.myBets).map(([side, amt]) => (
              <div
                key={side}
                className="glass p-3 rounded-xl text-center text-sm font-semibold"
              >
                {side}: {amt}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-70">本局尚未下注</div>
        )}
      </section>

      {/* 投注按鈕 */}
      {state.phase === "BETTING" && (
        <section className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">
          {["PLAYER", "BANKER", "TIE"].map((side) => (
            <button
              key={side}
              onClick={async () => {
                await fetch(`/api/casino/baccarat/bet`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ roomCode: room, side, amount: 100 }),
                });
              }}
              className="btn rounded-xl py-6 text-lg font-bold"
            >
              壓 {side}
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
