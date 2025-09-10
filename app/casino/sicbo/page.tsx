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
          闂備緡鍋呰ぐ鍐矗閸℃稑绠ｉ柛褎顨嗛悘?
        </button>
      </div>
      {data ? (
        <>
          <div className="text-sm opacity-80">
            闁诲繒鍋愰崑鎾绘煣?<b>{data.current.daySeq}</b>闂佹寧绻冪划搴㈠垔椤撱垹绠?<b>{data.current.phase}</b>闂佹寧绻冪划宀勫焵椤掍礁绗氶柡?<b>{countdown}s</b>
          </div>
          <div className="text-sm opacity-80">
            婵炴垶鎸搁敃銈夋儑椤掑嫭鏅?
            {last ? (
              <span>
                婵°倗濮抽崡鍐差焽?<b>{last.die1}-{last.die2}-{last.die3}</b>闂佹寧绋戦悧蹇涙⒔閸曨剦娓?<b>{last.sum}</b>
                {last.isTriple ? "闂佹寧绋戦懟顖氾耿閸ヮ煈娈? : ""}闂?
              </span>
            ) : "闁诲繐绻戝銊╁礉?}
          </div>
        </>
      ) : <div className="text-sm opacity-60">闁哄鎸搁ˇ顖炲矗閸℃鈻旀い鎾寸▓閸?/div>}
    </div>
  );
}

export default function SicboLobby() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sic Bo 婵°倗濮靛姗€顢氶锝呯窞鐟滃秹骞€閳?/h1>
      <div className="grid md:grid-cols-3 gap-4">
        <RoomCard room="R30" />
        <RoomCard room="R60" />
        <RoomCard room="R90" />
      </div>
    </div>
  );
}
