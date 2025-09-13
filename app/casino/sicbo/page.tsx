"use client";

import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Room = "SB_R30" | "SB_R60" | "SB_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateApi = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};

const ROOMS: Room[] = ["SB_R30", "SB_R60", "SB_R90"];
const ROOM_NAME: Record<Room, string> = { SB_R30: "30秒房", SB_R60: "60秒房", SB_R90: "90秒房" };
const PHASE_ZH: Record<Phase, string> = { BETTING: "下注中", REVEALING: "開獎中", SETTLED: "已結算" };

function fmtS(t: number) {
  const v = Math.max(0, Math.floor(t));
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useRoom(room: Room) {
  const [state, setState] = useState<StateApi | null>(null);
  const [lockIn, setLockIn] = useState(0);
  const [endIn, setEndIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j: StateApi = await res.json();
      setState(j);
      setLockIn(j.timers?.lockInSec ?? 0);
      setEndIn(j.timers?.endInSec ?? 0);
    } catch {
      // 讓卡片顯示「取得失敗」但仍保留其它房間
      setState(null);
      setLockIn(0);
      setEndIn(0);
    }
  };

  useEffect(() => {
    load();
    const sync = setInterval(load, 5000); // 每 5 秒與伺服器同步修正
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setLockIn((v) => (v > 0 ? v - 1 : 0));
      setEndIn((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => {
      clearInterval(sync);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return { state, lockIn, endIn, reload: load };
}

function RoomCard({ room }: { room: Room }) {
  const router = useRouter();
  const { state, lockIn, endIn, reload } = useRoom(room);

  return (
    <div className="room-card glass">
      <div className="room-head">
        <div className="room-name">{ROOM_NAME[room]}</div>
        <button className="room-refresh" onClick={reload}>重新整理</button>
      </div>

      {state ? (
        <>
          <div className="room-row">
            <span className="k">局號</span>
            <span className="v mono">{state.round.id.slice(-6)}</span>
          </div>
          <div className="room-row">
            <span className="k">狀態</span>
            <span className="v">{PHASE_ZH[state.round.phase]}</span>
          </div>
          <div className="room-row">
            <span className="k">封盤倒數</span>
            <span className="v mono">{fmtS(lockIn)}</span>
          </div>
          <div className="room-row">
            <span className="k">結束倒數</span>
            <span className="v mono">{fmtS(endIn)}</span>
          </div>

          <div className="room-cta">
            <button className="btn btn--enter" onClick={() => router.push(`/casino/sicbo/rooms/${room}`)}>
              進入房間 →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="room-row">
            <span className="k">狀態</span>
            <span className="v">無法取得資料</span>
          </div>
          <div className="room-cta">
            <button className="btn" onClick={reload}>重試</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SicboLobby() {
  return (
    <>
      <Head>
        {/* 大廳專用 CSS（含流光背景與卡片樣式） */}
        <link rel="stylesheet" href="/styles/sicbo.css" />
      </Head>

      <div className="lobby-wrap">
        <header className="lobby-head">
          <h1>🎲 骰寶大廳</h1>
          <p className="sub">選擇一個房間開始遊戲</p>
        </header>

        <section className="room-grid">
          {ROOMS.map((r) => (
            <RoomCard key={r} room={r} />
          ))}
        </section>
      </div>
    </>
  );
}
