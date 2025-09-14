// app/casino/baccarat/page.tsx  或你原本的大廳檔案
"use client";

import { useEffect, useRef, useState } from "react";

type RoomInfo = {
  code: "R30" | "R60" | "R90";
  enabled: boolean;
  betSeconds: number;
  revealSeconds: number;
  state: {
    round: { id: string; seq: number; phase: "BETTING" | "REVEALING" | "SETTLED"; startedAt: string; endsAt: string };
    timers: { lockInSec: number; endInSec: number };
    locked: boolean;
    bead: ("PLAYER" | "BANKER" | "TIE")[];
  };
};

export default function BaccaratLobby() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRooms = async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const r = await fetch("/api/casino/baccarat/rooms", {
        signal: abortRef.current.signal,
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "HTTP_ERROR");

      setRooms(d.rooms ?? []);
      setError(null);
    } catch (e: any) {
      // 不要打斷 UI，只顯示錯誤並保留舊資料
      setError("無法更新房間資訊");
    } finally {
      setLoading(false);
    }
  };

  // 啟動輪詢（3 秒一次），但在頁面不可見時暫停
  const startPolling = () => {
    stopPolling();
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchRooms();
    }, 3000);
  };

  const stopPolling = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    abortRef.current?.abort();
  };

  useEffect(() => {
    // 初次載入
    fetchRooms();
    startPolling();

    // 可見性切換（背景暫停、回前景立刻抓一次並恢復輪詢）
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchRooms();
        startPolling();
      } else {
        stopPolling();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-6 text-white">載入中...</div>;

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">百家樂大廳</h1>
        {error && <span className="text-sm text-yellow-400">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.map((r) => (
          <a key={r.code} href={`/casino/baccarat/rooms/${r.code}`} className="block">
            <div className="rounded-xl p-5 bg-gray-900 hover:bg-gray-800 shadow-lg transition">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">房間 {r.code}</h2>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    r.state.round.phase === "BETTING"
                      ? "bg-green-600"
                      : r.state.round.phase === "REVEALING"
                      ? "bg-yellow-600"
                      : "bg-gray-600"
                  }`}
                >
                  {r.state.round.phase}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <p>局號：{r.state.round.seq}</p>
                <p>下注秒數：{r.betSeconds}</p>
                <p>開牌秒數：{r.revealSeconds}</p>
                <p>剩餘時間：{r.state.timers.endInSec} 秒</p>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-400">最近珠盤路：</p>
                <div className="flex gap-1 mt-1">
                  {r.state.bead.slice(-12).map((o, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                        o === "PLAYER" ? "bg-blue-500" : o === "BANKER" ? "bg-red-500" : "bg-green-500"
                      }`}
                      title={o}
                    >
                      {o === "PLAYER" ? "P" : o === "BANKER" ? "B" : "T"}
                    </span>
                  ))}
                </div>
              </div>

              {!r.enabled && (
                <div className="mt-3 text-xs text-red-400">此房間維護中</div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
