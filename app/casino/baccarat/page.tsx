// app/casino/baccarat/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LobbyRoom = {
  code: "R30" | "R60" | "R90";
  name: string;
  description: string;
  secondsPerRound: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  secLeft: number;
  playerCount: number;
};

export default function BaccaratLobbyPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/casino/baccarat/rooms", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "載入失敗");
      setRooms(json.rooms || []);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "連線失敗");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 text-white bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(96,165,250,.12),transparent_60%),radial-gradient(1000px_800px_at_110%_10%,rgba(167,139,250,.12),transparent_60%),radial-gradient(800px_700px_at_50%_110%,rgba(253,164,175,.10),transparent_60%)]">
      <h1 className="text-2xl font-bold mb-6">百家樂大廳</h1>

      {err && <div className="mb-4 text-sm text-rose-300">⚠️ {err}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <button
            key={r.code}
            onClick={() => router.push(`/casino/baccarat/rooms/${r.code}`)}
            className="text-left rounded-2xl border border-white/15 hover:border-white/30 transition p-5 bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,.35)]"
            title={`進入 ${r.name}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xl font-extrabold">{r.name}</div>
              <div className="text-xs opacity-80">{r.secondsPerRound}s/局</div>
            </div>

            <p className="mt-2 text-sm opacity-90 line-clamp-2">{r.description || "—"}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <div className="opacity-70 text-xs">狀態</div>
                <div className="font-semibold">
                  {r.phase === "BETTING" ? "下注中" : r.phase === "REVEALING" ? "開牌中" : "已結算"}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <div className="opacity-70 text-xs">倒數</div>
                <div className="font-semibold">{r.phase === "BETTING" ? `${r.secLeft}s` : "—"}</div>
              </div>
              <div className="rounded-lg border border-white/10 px-3 py-2 bg-white/5">
                <div className="opacity-70 text-xs">目前玩家</div>
                <div className="font-semibold">{r.playerCount}</div>
              </div>
            </div>
          </button>
        ))}

        {rooms.length === 0 && (
          <div className="opacity-80">暫無房間資料</div>
        )}
      </div>
    </main>
  );
}
