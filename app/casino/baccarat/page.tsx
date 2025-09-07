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
  countdown: number;
  online: number;
};

export default function BaccaratRoomsPage() {
  const [rooms, setRooms] = useState<RoomBrief[]>([]);

  useEffect(() => {
    let poll: any;
    let tick: any;

    const fetchRooms = async () => {
      try {
        const r = await fetch("/api/casino/baccarat/rooms", { cache: "no-store" });
        if (!r.ok) throw new Error("failed");
        const d = await r.json();
        setRooms(d.rooms ?? []);
      } catch {
        // ignore 一次拉失敗就等下一輪
      }
    };

    fetchRooms();
    poll = setInterval(fetchRooms, 1000);
    // 本地平滑倒數
    tick = setInterval(() => {
      setRooms((prev) => prev.map((x) => ({ ...x, countdown: Math.max(0, (x.countdown ?? 0) - 1) })));
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const zh: Record<Phase, string> = { BETTING: "下注中", REVEALING: "開牌中", SETTLED: "已結算" };

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

            <div className={`room-phase ${r.phase.toLowerCase()}`}>
              {zh[r.phase]}
            </div>

            <div className="room-meta">
              <span className="room-countdown" title="本局倒數">{r.countdown}s</span>
              <span className="room-online" title="在線人數">👥 {r.online}</span>
            </div>

            <div className="room-enter">進入房間 →</div>
            <div className="sheen" />
          </Link>
        ))}

        {rooms.length === 0 && (
          <div className="room-empty glass">讀取中或暫無房間…</div>
        )}
      </section>

      {/* 保持你原本的載法 */}
      <link rel="stylesheet" href="/styles/baccarat.css" />
    </main>
  );
}
