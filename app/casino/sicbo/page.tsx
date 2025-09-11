"use client";

import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RoomKey = "R30" | "R60" | "R90";
type SicboRoomCode = "SB_R30" | "SB_R60" | "SB_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateApi = {
  room: SicboRoomCode;
  round: { id: string; phase: Phase; startedAt: string; endedAt?: string; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};

type HistoryApi = {
  room: SicboRoomCode;
  items: { id: string; dice: number[]; endedAt: string }[];
};

// UI 需要的狀態
type ViewState = {
  room: RoomKey;
  current: { roundIdShort: string; phase: Phase; lockInSec: number };
  last?: { d1: number; d2: number; d3: number; sum: number; isTriple: boolean };
};

const ROOM_MAP: Record<RoomKey, SicboRoomCode> = {
  R30: "SB_R30",
  R60: "SB_R60",
  R90: "SB_R90",
};

function sum(d: number[]) {
  return (d?.[0] || 0) + (d?.[1] || 0) + (d?.[2] || 0);
}
function isTriple(d: number[]) {
  return d?.[0] === d?.[1] && d?.[1] === d?.[2] && d?.[0] != null;
}
function fmtSec(s: number) {
  const v = Math.max(0, Math.floor(s));
  const m = Math.floor(v / 60);
  const r = v % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function useRoomState(room: RoomKey) {
  const [data, setData] = useState<ViewState | null>(null);
  const [countdown, setCountdown] = useState(0);
  const tickRef = useRef<number | null>(null);

  async function load() {
    const code = ROOM_MAP[room];

    // 讀 state
    const rs = await fetch(`/api/casino/sicbo/state?room=${code}`, { cache: "no-store" });
    const state: StateApi = await rs.json();

    // 讀最後一局（1 筆）
    const rh = await fetch(`/api/casino/sicbo/history?room=${code}&limit=1`, { cache: "no-store" });
    const hist: HistoryApi = await rh.json();
    const lastDice = hist?.items?.[0]?.dice ?? [];

    const view: ViewState = {
      room,
      current: {
        roundIdShort: state?.round?.id?.slice(-6) ?? "-",
        phase: state?.round?.phase ?? "BETTING",
        lockInSec: state?.timers?.lockInSec ?? 0,
      },
      last: lastDice.length === 3 ? {
        d1: lastDice[0],
        d2: lastDice[1],
        d3: lastDice[2],
        sum: sum(lastDice),
        isTriple: isTriple(lastDice),
      } : undefined,
    };

    setData(view);
    setCountdown(view.current.lockInSec);

    // 重置倒數計時器（本地每秒 -1）
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setCountdown((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 5000); // 每 5s 拉一次，修正偏差
    return () => {
      clearInterval(poll);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return { data, countdown, reload: load };
}

function Dice({ n, rolling = false, size = "md" }: { n?: number; rolling?: boolean; size?: "sm" | "md" | "lg" }) {
  const faceCls = n ? `face-${n}` : "";
  const sizeCls = size === "sm" ? "dice-sm" : size === "lg" ? "dice-lg" : "";
  const rollingCls = rolling ? "rolling" : "";
  return (
    <span className={["dice", faceCls, sizeCls, rollingCls].filter(Boolean).join(" ")}>
      <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
      <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
      <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
    </span>
  );
}

function RoomCard({ room }: { room: RoomKey }) {
  const { data, countdown, reload } = useRoomState(room);
  const router = useRouter();
  const last = data?.last;

  // REVEALING 時顯示滾動動畫（lobby 不知道即時結果，動畫更直覺）
  const rolling = data?.current.phase === "REVEALING";

  return (
    <div className="glass p-4 rounded-lg flex flex-col gap-3 bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{room}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={reload}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={() => router.push(`/casino/sicbo/rooms/${ROOM_MAP[room]}`)}
            className="px-3 py-1 rounded bg-white/20 hover:bg-white/30"
          >
            Enter
          </button>
        </div>
      </div>

      {data ? (
        <>
          <div className="text-sm opacity-80">
            Round <b>{data.current.roundIdShort}</b> | Phase <b>{data.current.phase}</b> | Lock in{" "}
            <b>{fmtSec(countdown)}</b>
          </div>

          <div className="flex items-center gap-2 text-sm opacity-80">
            <span className="opacity-80">Last:</span>
            {last ? (
              <>
                <Dice n={last.d1} size="sm" />
                <Dice n={last.d2} size="sm" />
                <Dice n={last.d3} size="sm" />
                <span>
                  (Sum <b>{last.sum}</b>
                  {last.isTriple ? <span>, Triple</span> : null})
                </span>
              </>
            ) : (
              <span>N/A</span>
            )}
          </div>

          {rolling && (
            <div className="text-xs text-amber-300">Rolling…等待開獎</div>
          )}
        </>
      ) : (
        <div className="text-sm opacity-60">Loading...</div>
      )}
    </div>
  );
}

export default function SicboLobby() {
  return (
    <>
      {/* 載入獨立 CSS（含骰子動畫） */}
      <Head>
        <link rel="stylesheet" href="/styles/sicbo.css" />
      </Head>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Sic Bo Lobby</h1>
        <div className="grid md:grid-cols-3 gap-4">
          <RoomCard room="R30" />
          <RoomCard room="R60" />
          <RoomCard room="R90" />
        </div>
      </div>
    </>
  );
}
