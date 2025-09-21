"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "@/public/styles/roulette-lobby.css";

type Room = "RL_R30" | "RL_R60" | "RL_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; result: number | null };
  timers:
    | { lockInSec: number; endInSec: number; revealWindowSec: number }          // 你現有的秒數版
    | { lockMs?: number; endMs?: number; revealWindowMs?: number; now?: number }; // 另一種毫秒版（相容）
  locked: boolean;
};

type Overview = {
  room: Room;
  roundId: string;
  myTotal: number;
  totalAmount: number;
  totalBets: number;
  uniqueUsers: number;
};

const ROOMS: { code: Room; label: string; desc: string }[] = [
  { code: "RL_R30", label: "R30", desc: "30s 投注 + 10s 揭示" },
  { code: "RL_R60", label: "R60", desc: "同步節奏（示例）" },
  { code: "RL_R90", label: "R90", desc: "同步節奏（示例）" },
];

// 以秒數顯示的本地狀態
type LocalState = {
  room: Room;
  roundId: string | null;
  phase: Phase;
  result: number | null;
  lockSec: number;   // 距離封盤（0 代表已封）
  settleSec: number; // 距離結算（含揭示動畫結束）
};

function toInt(n: unknown, fallback = 0) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : fallback;
}

// 把後端 timers 轉成秒制
function parseTimersToSec(timers: StateResp["timers"]) {
  // 秒制
  if ("lockInSec" in timers && "endInSec" in timers) {
    return {
      lockSec: toInt(timers.lockInSec),
      settleSec: toInt(timers.endInSec),
    };
  }
  // 毫秒制（相容）
  const lockMs = (timers as any).lockMs ?? (timers as any).msToLock ?? (timers as any).ms_left_lock;
  const endMs = (timers as any).endMs ?? (timers as any).msToEnd ?? (timers as any).ms_left_end;
  return {
    lockSec: toInt((lockMs ?? 0) / 1000),
    settleSec: toInt((endMs ?? 0) / 1000),
  };
}

// 千分位
function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString();
}

export default function RouletteLobby() {
  const [local, setLocal] = useState<Record<Room, LocalState>>({
    RL_R30: { room: "RL_R30", roundId: null, phase: "BETTING", result: null, lockSec: 0, settleSec: 0 },
    RL_R60: { room: "RL_R60", roundId: null, phase: "BETTING", result: null, lockSec: 0, settleSec: 0 },
    RL_R90: { room: "RL_R90", roundId: null, phase: "BETTING", result: null, lockSec: 0, settleSec: 0 },
  });

  const [overviews, setOverviews] = useState<Record<Room, Overview | null>>({
    RL_R30: null, RL_R60: null, RL_R90: null,
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollOverviewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 拉最新狀態（並校正本地秒數）
  const pullState = async (room: Room) => {
    try {
      const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
      if (!r.ok) throw new Error("state fetch failed");
      const j: StateResp = await r.json();

      const { lockSec, settleSec } = parseTimersToSec(j.timers);
      setLocal((s) => ({
        ...s,
        [room]: {
          room,
          roundId: j.round?.id ?? s[room].roundId,
          phase: j.round?.phase ?? s[room].phase,
          result: j.round?.result ?? s[room].result,
          lockSec,
          settleSec,
        },
      }));
    } catch {
      // 失敗就略過，不覆蓋現有顯示
    }
  };

  const pullOverview = async (room: Room) => {
    try {
      const r = await fetch(`/api/casino/roulette/overview?room=${room}`, { cache: "no-store" });
      if (!r.ok) throw new Error("overview fetch failed");
      const j: Overview = await r.json();
      setOverviews((s) => ({ ...s, [room]: j }));
    } catch {
      // ignore
    }
  };

  // 初始化：先拉一次所有房，之後每 5/6 秒輪詢；本地每秒 -1
  useEffect(() => {
    ROOMS.forEach((r) => { pullState(r.code); pullOverview(r.code); });

    if (!tickRef.current) {
      tickRef.current = setInterval(() => {
        setLocal((prev) => {
          const next: typeof prev = { ...prev };
          for (const r of ROOMS) {
            const cur = prev[r.code];
            const lockSec = cur.lockSec > 0 ? cur.lockSec - 1 : 0;
            const settleSec = cur.settleSec > 0 ? cur.settleSec - 1 : 0;
            next[r.code] = { ...cur, lockSec, settleSec };
          }
          return next;
        });
      }, 1000);
    }
    if (!pollStateRef.current) {
      pollStateRef.current = setInterval(() => {
        ROOMS.forEach((r) => pullState(r.code));
      }, 5000);
    }
    if (!pollOverviewRef.current) {
      pollOverviewRef.current = setInterval(() => {
        ROOMS.forEach((r) => pullOverview(r.code));
      }, 6000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (pollStateRef.current) clearInterval(pollStateRef.current);
      if (pollOverviewRef.current) clearInterval(pollOverviewRef.current);
      tickRef.current = null;
      pollStateRef.current = null;
      pollOverviewRef.current = null;
    };
  }, []);

  return (
    <div className="rlb-wrap">
      <header className="rlb-head">
        <h1>Roulette Lobby</h1>
        <p className="muted">選擇一個房間進入下注</p>
      </header>

      <section className="rlb-grid">
        {ROOMS.map(({ code, label, desc }) => {
          const st = local[code];
          const ov = overviews[code];
          const phase = st.phase;
          const lock = st.lockSec;
          const end = st.settleSec;

          // 顯示結果：只有在 SETTLED 顯示數字，其餘顯示 "--"
          const showResult =
            phase === "SETTLED" && typeof st.result === "number"
              ? String(st.result)
              : "--";

          const spinClass = phase === "REVEALING" ? "spin" : "";

          return (
            <Link key={code} href={`/casino/roulette/rooms/${code}`} className="rlb-card">
              <div className={`badge ${phase.toLowerCase()}`}>{phase}</div>

              <div className="wheel" aria-label={`wheel-${code}`}>
                <div className="pin" />
                <div className={`spinring ${spinClass}`} />
                <div className="result">{showResult}</div>
              </div>

              <h3 className="title">{label}</h3>
              <p className="desc">{desc}</p>

              <div className="stats">
                <span>Bet close in <b>{lock}</b>s</span>
                <span>Settle in <b>{end}</b>s</span>
              </div>

              <div className="overview">
                <div className="ov">
                  <div className="ov-k">我本局</div>
                  <div className="ov-v">${fmt(ov?.myTotal)}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">投注量</div>
                  <div className="ov-v">${fmt(ov?.totalAmount)}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">筆數</div>
                  <div className="ov-v">{fmt(ov?.totalBets)}</div>
                </div>
                <div className="ov">
                  <div className="ov-k">人數</div>
                  <div className="ov-v">{fmt(ov?.uniqueUsers)}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
