// app/casino/baccarat/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type RoomBrief = {
  code: RoomCode;
  phase: Phase;
  roundId: string | null;
  countdown: number; // 伺服器回傳剩餘秒數
  online: number;
};

export default function BaccaratRoomsPage() {
  const [rooms, setRooms] = useState<RoomBrief[]>([]);

  // 每秒輪詢房間列表，並用本地倒數做平滑
  useEffect(() => {
    let timer: any;
    let tick: any;

    const fetchRooms = async () => {
      try {
        const r = await fetch("/api/casino/baccarat/rooms", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const d = await r.json();
        const list: RoomBrief[] = d.rooms ?? [];
        setRooms(list);
      } catch {
        // 失敗時不改動，等下次輪詢
      }
    };

    // 每秒取一次
    const startPolling = () => {
      fetchRooms();
      timer = setInterval(fetchRooms, 1000);
      // 本地倒數：每 1s 全體 -1（不小於 0），讓畫面更順
      tick = setInterval(() => {
        setRooms((prev) =>
          prev.map((r) => ({
            ...r,
            countdown: Math.max(0, (r.countdown ?? 0) - 1),
          }))
        );
      }, 1000);
    };

    startPolling();
    return () => {
      clearInterval(timer);
      clearInterval(tick);
    };
  }, []);

  const phaseClass = (p: Phase) =>
    p === "BETTING" ? "betting" : p === "REVEALING" ? "revealing" : "settled";

  const phaseZh: Record<Phase, string> = {
    BETTING: "下注中",
    REVEALING: "開牌中",
    SETTLED: "已結算",
  };

  return (
    <main className="bk-wrap">
      <header className="bk-header">
        <div className="left">
          <Link href="/" className="bk-logo">TOPZCASINO</Link>
          <span className="bk-room">Baccarat</span>
        </div>
        <div className="center">
          <div className="bk-phase betting">SELECT ROOM</div>
        </div>
        <div className="right">
          <Link href="/" className="bk-btn ghost">返回大廳</Link>
        </div>
      </header>

      <section className="rooms-grid">
        {rooms.map((r) => (
          <Link
            key={r.code}
            href={`/casino/baccarat/rooms/${r.code}`}
            className="room-card glass tilt"
          >
            <div className="room-code">{r.code}</div>

            <div className={`room-phase ${phaseClass(r.phase)}`}>
              {phaseZh[r.phase]}
            </div>

            <div className="room-meta">
              <span className="room-countdown" title="本局倒數">{r.countdown}s</span>
              <span className="room-online" title="在線人數">👥 {r.online}</span>
            </div>

            <div className="room-enter">進入房間 →</div>
            <div className="sheen" />
          </Link>
        ))}

        {/* 沒資料時的占位 */}
        {rooms.length === 0 && (
          <div className="room-empty glass">
            讀取中或暫無房間…
          </div>
        )}
      </section>

      <link rel="stylesheet" href="/styles/baccarat.css" />
    </main>
  );
}
