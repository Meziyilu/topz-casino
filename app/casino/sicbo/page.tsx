"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Room = "SB_R30" | "SB_R60" | "SB_R90";

type RoomState = {
  room: Room;
  roundId: string;
  phase: "BETTING" | "REVEALING" | "SETTLED";
  timers: { lockInSec: number; endInSec: number };
};

const ROOM_NAMES: Record<Room, string> = {
  SB_R30: "30秒房",
  SB_R60: "60秒房",
  SB_R90: "90秒房",
};

export default function SicboLobbyPage() {
  const router = useRouter();
  const [states, setStates] = useState<RoomState[]>([]);

  async function fetchStates() {
    const res = await fetch(`/api/casino/sicbo/state-all`, { cache: "no-store" });
    if (res.ok) {
      const j = await res.json();
      setStates(j?.rooms ?? []);
    }
  }

  useEffect(() => {
    fetchStates();
    const t = setInterval(fetchStates, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sicbo-lobby">
      <h1 className="title">🎲 骰寶大廳</h1>
      <div className="rooms">
        {states.map((s) => (
          <div
            key={s.room}
            className="room-card glass"
            onClick={() => router.push(`/casino/sicbo/rooms/${s.room}`)}
          >
            <div className="room-name">{ROOM_NAMES[s.room]}</div>
            <div className="room-phase">
              狀態：{s.phase === "BETTING" ? "下注中" : s.phase === "REVEALING" ? "開獎中" : "已結算"}
            </div>
            <div className="room-timer">
              封盤倒數：<span>{s.timers.lockInSec}s</span>
            </div>
            <div className="room-timer">
              結束倒數：<span>{s.timers.endInSec}s</span>
            </div>
            <div className="room-join">進入房間 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
