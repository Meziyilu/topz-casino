// app/casino/page.tsx
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";

type Room = { id: string; code: "R30"|"R60"|"R90"; name: string; durationSeconds: number };

export default function CasinoLobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  useEffect(() => { fetch("/api/casino/rooms").then(r=>r.json()).then(setRooms).catch(()=>{}); }, []);
  return (
    <div className="glass neon">
      <div className="content">
        <h1 className="h1">百家樂大廳</h1>
        <div className="grid">
          {rooms.map(r=>(
            <div key={r.id} className="card col-4">
              <h3>{r.name}</h3>
              <p>局長：{r.durationSeconds}s</p>
              <Link href={`/casino/baccarat/${r.code}`} className="btn shimmer">進入房間</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
