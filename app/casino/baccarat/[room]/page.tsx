"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import FlipTile from "@/components/FlipTile";

const fetcher = (u: string) =>
  fetch(u, { credentials: "include", cache: "no-store" }).then((r) => r.json());

type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR";

export default function RoomPage({ params }: { params: { room: string } }) {
  const roomCode = (params.room || "R60").toUpperCase();
  const { data, mutate } = useSWR(
    `/api/casino/baccarat/state?room=${roomCode}`,
    fetcher,
    { refreshInterval: 1000 }
  );

  const [placing, setPlacing] = useState<BetSide | null>(null);

  // 每局觸發翻牌動畫的 key
  const revealKey = useMemo(() => {
    if (!data) return "init";
    return `${data.roundId || "none"}-${data.phase}`;
  }, [data?.roundId, data?.phase]);

  const secondsLeft = data ? Math.max(0, data.secLeft ?? data.secondsLeft ?? 0) : 0;

  async function placeBet(side: BetSide) {
    if (!data || data.phase !== "BETTING") return;
    setPlacing(side);
    try {
      await fetch(`/api/casino/baccarat/bet?room=${roomCode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: 100 }),
      });
      mutate();
    } finally {
      setPlacing(null);
    }
  }

  return (
    <div className="min-h-screen bg-casino-bg text-white p-6 flex flex-col items-center gap-6">
      {/* 標題 */}
      <h1 className="text-2xl font-bold tracking-wide">
        百家樂房間 {roomCode}
      </h1>

      {/* 倒數 */}
      {data && (
        <div className="text-lg font-mono">
          狀態：
          {data.phase === "BETTING"
            ? "下注中"
            : data.phase === "REVEALING"
            ? "開牌中"
            : "已結算"}
          {" ｜ "}
          剩餘秒數：{secondsLeft}
        </div>
      )}

      {/* 翻牌動畫區 */}
      {data && data.phase !== "BETTING" && data.result && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-3xl items-start mt-6">
          <FlipTile
            label="PLAYER"
            total={data.result.p}
            outcome={data.result.outcome || null}
            triggerKey={revealKey}
          />
          <FlipTile
            label="BANKER"
            total={data.result.b}
            outcome={data.result.outcome || null}
            triggerKey={revealKey}
          />
        </div>
      )}
      {data && data.phase === "BETTING" && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-3xl items-start mt-6 opacity-70">
          <FlipTile
            label="PLAYER"
            total={null}
            outcome={null}
            triggerKey={`${data.roundId}-idle`}
          />
          <FlipTile
            label="BANKER"
            total={null}
            outcome={null}
            triggerKey={`${data.roundId}-idle`}
          />
        </div>
      )}

      {/* 下注按鈕 */}
      {data && data.phase === "BETTING" && (
        <div className="grid grid-cols-3 gap-4 mt-8">
          {(["PLAYER", "BANKER", "TIE"] as BetSide[]).map((side) => (
            <button
              key={side}
              disabled={!!placing}
              onClick={() => placeBet(side)}
              className={`btn tilt ${placing === side ? "opacity-50" : ""}`}
            >
              下 {side === "PLAYER" ? "閒" : side === "BANKER" ? "莊" : "和"}
            </button>
          ))}
        </div>
      )}

      {/* 我的投注 */}
      {data && data.myBets && Object.keys(data.myBets).length > 0 && (
        <div className="mt-10 w-full max-w-lg">
          <h2 className="text-lg font-semibold mb-2">我的投注</h2>
          <div className="space-y-2">
            {Object.entries<number>(data.myBets).map(([side, amt]) => (
              <div
                key={side}
                className="glass p-3 rounded flex justify-between text-sm"
              >
                <span>
                  {side === "PLAYER" ? "閒" : side === "BANKER" ? "莊" : side === "TIE" ? "和" : side}
                </span>
                <span>{amt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
