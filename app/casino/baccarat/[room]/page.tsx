"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function BaccaratRoom() {
  const { room } = useParams<{ room: string }>();
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    async function fetchState() {
      const res = await fetch(`/api/casino/baccarat/state?room=${room}`);
      const data = await res.json();
      setState(data);
    }
    fetchState();
    const timer = setInterval(fetchState, 1000);
    return () => clearInterval(timer);
  }, [room]);

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        載入中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">
        🃏 {state.room.name} — 第 {state.roundSeq} 局
      </h1>
      <p className="mb-2">狀態：{state.phase}</p>
      <p className="mb-4">倒數：{state.secLeft}s</p>

      {state.phase === "BETTING" && (
        <div className="grid grid-cols-3 gap-4">
          {["PLAYER", "BANKER", "TIE"].map((side) => (
            <button
              key={side}
              onClick={async () => {
                await fetch("/api/casino/baccarat/bet", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ room, side, amount: 100 }),
                });
              }}
              className="p-6 rounded-lg bg-blue-500/70 hover:bg-blue-400 transition font-bold"
            >
              下 {side}
            </button>
          ))}
        </div>
      )}

      {state.phase === "SETTLED" && state.result && (
        <div className="mt-6 p-6 rounded-lg bg-green-500/20 border border-green-400 animate-fade-in">
          🎉 本局結果：{state.result.outcome}  
          <p>玩家點數 {state.result.p} — 莊家點數 {state.result.b}</p>
        </div>
      )}
    </div>
  );
}
