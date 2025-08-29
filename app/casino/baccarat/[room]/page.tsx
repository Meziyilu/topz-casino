"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import FlipTile from "@/components/FlipTile";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

export default function RoomPage() {
  const { room } = useParams();
  const router = useRouter();
  const [betting, setBetting] = useState(false);

  const { data, error, mutate } = useSWR(
    room ? `/api/casino/baccarat/state?room=${room}` : null,
    fetcher,
    { refreshInterval: 1000 }
  );

  if (error) return <div className="text-red-500">載入失敗</div>;
  if (!data) return <div className="text-gray-400">載入中…</div>;

  const placeBet = async (side: string) => {
    setBetting(true);
    await fetch(`/api/casino/baccarat/bet?room=${room}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side, amount: 100 }),
    });
    setBetting(false);
    mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white bg-gradient-to-br from-purple-900 via-black to-blue-900">
      <h1 className="text-3xl font-bold mb-4">{data.room.name}</h1>

      {/* 倒數 + 狀態 */}
      <div className="glass px-6 py-3 rounded-xl mb-6 text-center">
        <p className="text-lg">局序：{String(data.roundSeq).padStart(4, "0")}</p>
        <p className="text-lg">狀態：{data.phase}</p>
        <p className="text-lg">倒數：{data.secLeft}s</p>
      </div>

      {/* 投注按鈕 */}
      <div className="flex gap-4 mb-8">
        {["PLAYER", "BANKER", "TIE"].map((side) => (
          <button
            key={side}
            disabled={betting || data.phase !== "BETTING"}
            onClick={() => placeBet(side)}
            className="btn tilt"
          >
            {side}
          </button>
        ))}
      </div>

      {/* 翻牌動畫 */}
      {data.phase !== "BETTING" && data.result && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          <FlipTile label="PLAYER" value={data.result.p} outcome={data.result.outcome} />
          <FlipTile label="BANKER" value={data.result.b} outcome={data.result.outcome} />
        </div>
      )}

      {/* 返回大廳 */}
      <button
        onClick={() => router.push("/lobby")}
        className="mt-10 px-6 py-2 rounded-lg glass hover:bg-purple-600 transition"
      >
        返回大廳
      </button>
    </div>
  );
}
