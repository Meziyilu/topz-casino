// app/lobby/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RoomState = {
  room: { code: "R30" | "R60" | "R90"; name: string; durationSeconds: number };
  roundSeq: number;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  secLeft: number;
};

const ROOM_CODES = [
  { code: "R30" as const, label: "30秒房" },
  { code: "R60" as const, label: "60秒房" },
  { code: "R90" as const, label: "90秒房" },
];

function useRoomState(code: "R30" | "R60" | "R90") {
  const [data, setData] = useState<RoomState | null>(null);
  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        const r = await fetch(`/api/casino/baccarat/state?room=${code}`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "狀態讀取失敗");
        setData({
          room: j.room,
          roundSeq: j.roundSeq,
          phase: j.phase,
          secLeft: j.secLeft,
        });
      } catch (e) {
        // 靜默
      }
    };
    load();
    timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [code]);
  return data;
}

function RoomCard({ code, label }: { code: "R30" | "R60" | "R90"; label: string }) {
  const s = useRoomState(code);
  return (
    <Link href={`/casino/baccarat/${code}`} className="room-card glow-ring sheen block">
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-wide">{label}</h3>
          <span className="text-xs opacity-70">代碼 {code}</span>
        </div>
        <div className="mt-3 text-sm opacity-80">
          局序：<b>{s?.roundSeq ?? "…"}</b>
        </div>
        <div className="mt-1 text-sm opacity-80">
          狀態：<b>{s?.phase ?? "…"}</b>
        </div>
        <div className="mt-2">
          <div className="text-4xl font-extrabold tabular-nums">
            {s?.secLeft ?? "…"}<span className="text-sm ml-1">s</span>
          </div>
        </div>
        <div className="mt-3 text-xs opacity-60">點擊進入房間</div>
      </div>
    </Link>
  );
}

export default function LobbyPage() {
  return (
    <div className="min-h-screen bg-gradient-casino px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black tracking-widest mb-6">TOPZCASINO 大廳</h1>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {ROOM_CODES.map((r) => (
            <RoomCard key={r.code} code={r.code} label={r.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
