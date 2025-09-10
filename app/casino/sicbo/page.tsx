"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RoomKey = "R30" | "R60" | "R90";
type StateResp = {
  room: RoomKey;
  current: { daySeq: number; phase: string; locksAt: string };
  history: { die1: number; die2: number; die3: number; sum: number; isTriple: boolean }[];
};

function useRoomState(room: RoomKey) {
  const [data, setData] = useState<StateResp | null>(null);
  const [countdown, setCountdown] = useState(0);

  async function load() {
    const r = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    const j = await r.json();
    setData(j);
    if (j?.current?.locksAt) {
      const left = Math.max(0, Math.floor((new Date(j.current.locksAt).getTime() - Date.now()) / 1000));
      setCountdown(left);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => {
      if (!data) return;
      const left = Math.max(0, Math.floor((new Date(data.current.locksAt).getTime() - Date.now()) / 1000));
      setCountdown(left);
    }, 1000);
    return () => clearInterval(t);
  }, [data]);

  return { data, countdown };
}

function RoomCard({ room }: { room: RoomKey }) {
  const { data, countdown } = useRoomState(room);
  const router = useRouter();
  const last = data?.history?.[0];
  return (
    <div className="glass p-4 rounded-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{room}</div>
        <button
          onClick={() => router.push(`/casino/sicbo/${room.toLowerCase()}`)}
          className="px-3 py-1 rounded bg-white/20 hover:bg-white/30"
        >
          進入房間
        </button>
      </div>
      {data ? (
        <>
          <div className="text-sm opacity-80">
            局�?<b>{data.current.daySeq}</b>｜狀�?<b>{data.current.phase}</b>｜倒數 <b>{countdown}s</b>
          </div>
          <div className="text-sm opacity-80">
            上局�?
            {last ? (
              <span>
                骰面 <b>{last.die1}-{last.die2}-{last.die3}</b>（總�?<b>{last.sum}</b>
                {last.isTriple ? "，圍�? : ""}�?
              </span>
            ) : "尚無"}
          </div>
        </>
      ) : <div className="text-sm opacity-60">載入中�?/div>}
    </div>
  );
}

export default function SicboLobby() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sic Bo 骰寶大廳</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <RoomCard room="R30" />
        <RoomCard room="R60" />
        <RoomCard room="R90" />
      </div>
    </div>
  );
}
