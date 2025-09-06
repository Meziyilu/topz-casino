// app/casino/baccarat/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RoomBrief = {
  code: "R30" | "R60" | "R90";
  phase: "BETTING" | "REVEALING" | "SETTLED";
  roundId: string | null;
  countdown: number;
  online: number;
};

export default function BaccaratRoomsPage() {
  const [rooms, setRooms] = useState<RoomBrief[]>([]);

  useEffect(() => {
    fetch("/api/casino/baccarat/rooms")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setRooms(d.rooms ?? []))
      .catch(() => setRooms([]));
  }, []);

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
          <Link key={r.code} href={`/casino/baccarat/rooms/${r.code}`} className="room-card glass tilt">
            <div className="room-code">{r.code}</div>
            <div className={`room-phase ${r.phase.toLowerCase()}`}>{r.phase}</div>
            <div className="room-countdown">{r.countdown}s</div>
            <div className="room-enter">進入房間 →</div>
            <div className="sheen" />
          </Link>
        ))}
      </section>

      <link rel="stylesheet" href="/styles/baccarat.css" />
    </main>
  );
}
