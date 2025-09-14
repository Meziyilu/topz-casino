"use client";

import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import "@/../public/styles/baccarat.css";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

interface RoundState {
  id: string;
  seq: number;
  phase: Phase;
  startedAt: string;
  endsAt: string;
}

interface StateResp {
  room: RoomCode;
  round: RoundState;
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
  table: {
    banker: number[];
    player: number[];
    outcome?: "PLAYER" | "BANKER" | "TIE";
  };
  bead: ("PLAYER" | "BANKER" | "TIE")[];
}

const CHIP_PRESETS = [10, 50, 100, 500, 1000];

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [time, setTime] = useState<string>("");

  const [chip, setChip] = useState<number>(CHIP_PRESETS[2]); // 預設 100
  const serverEndAtRef = useRef<number | null>(null);
  const [displayEndSec, setDisplayEndSec] = useState(0);

  const [winAnimData, setWinAnimData] = useState<any>(null);
  const [showWinAnim, setShowWinAnim] = useState(false);

  // 時鐘
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-TW")), 1000);
    return () => clearInterval(t);
  }, []);

  // 載入勝利 Lottie
  useEffect(() => {
    fetch("/lotties/baccarat-win.json")
      .then((r) => r.json())
      .then(setWinAnimData)
      .catch(() => setWinAnimData(null));
  }, []);

  // 狀態輪詢
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const res = await fetch(`/api/casino/baccarat/state?room=${params.room}`);
      const data: StateResp = await res.json();
      if (!mounted) return;

      setState((prev) => {
        if (prev?.round.phase !== "SETTLED" && data.round.phase === "SETTLED") {
          setShowWinAnim(true);
          setTimeout(() => setShowWinAnim(false), 3200);
        }
        return data;
      });

      const now = Date.now();
      serverEndAtRef.current = now + data.timers.endInSec * 1000;
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [params.room]);

  // 倒數平滑
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (serverEndAtRef.current) {
        const remain = Math.max(0, serverEndAtRef.current - now);
        setDisplayEndSec(Math.ceil(remain / 1000));
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  async function place(side: string, amt: number) {
    if (!state) return;
    setPlacing(true);
    try {
      await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
        body: JSON.stringify({ room: params.room, roundId: state.round.id, side, amount: amt }),
      });
      setBets((prev) => ({ ...prev, [side]: (prev[side] || 0) + amt }));
    } finally {
      setPlacing(false);
    }
  }

  const outcome = state?.table.outcome;
  const settled = state?.round.phase === "SETTLED";
  const revealing = state?.round.phase === "REVEALING";
  const locked = !!state?.locked || placing;

  const betOptions = [
    { key: "PLAYER", label: "閒" },
    { key: "BANKER", label: "莊" },
    { key: "TIE", label: "和" },
    { key: "PLAYER_PAIR", label: "閒對" },
    { key: "BANKER_PAIR", label: "莊對" },
    { key: "ANY_PAIR", label: "任意對" },
    { key: "PERFECT_PAIR", label: "完美對" },
    { key: "BANKER_SUPER_SIX", label: "超級六" },
  ];

  return (
    <div className={`baccarat-room dark-table ${revealing ? "reveal-effect" : ""}`}>
      <header className="room-header">
        <h1>百家樂 {params.room}</h1>
        <div className="inline-stats">
          <span>局號：{state?.round.seq ?? 0}</span>
          <span>狀態：{state?.round.phase ?? "-"}</span>
          <span>倒數：{displayEndSec} 秒</span>
          <span>時間：{time}</span>
        </div>
      </header>

      {/* 牌區 */}
      <div className="cards-area">
        <div className="side player">
          <h2>閒</h2>
          <div className="cards">
            {state?.table.player.map((c, i) => (
              <div key={i} className="card">{c}</div>
            ))}
          </div>
        </div>
        <div className="side banker">
          <h2>莊</h2>
          <div className="cards">
            {state?.table.banker.map((c, i) => (
              <div key={i} className="card">{c}</div>
            ))}
          </div>
        </div>
      </div>

      {/* 勝利 Lottie */}
      {showWinAnim && winAnimData && (
        <div className="win-lottie-overlay">
          <Lottie animationData={winAnimData} loop={false} autoplay />
        </div>
      )}

      {/* 籌碼列 */}
      <div className="chip-bar">
        {CHIP_PRESETS.map((v) => (
          <button
            key={v}
            className={`chip ${chip === v ? "active" : ""}`}
            disabled={locked}
            onClick={() => setChip(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {/* 下注面板（綠色） */}
      <div className="betting-panel green-panel">
        {betOptions.map((o) => {
          const glow = settled && outcome === o.key ? "glow-win" : "";
          return (
            <button
              key={o.key}
              className={`bet-btn ${o.key.toLowerCase()} ${glow}`}
              disabled={locked}
              onClick={() => place(o.key, chip)}
              data-amt={bets[o.key] || 0}
              title={`當前投注：${bets[o.key] || 0}`}
            >
              <span className="label">{o.label}</span>
              <span className="amt">{bets[o.key] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* 珠盤路 */}
      <div className="bead-road">
        {state?.bead.map((b, i) => (
          <span key={i} className={`dot ${b.toLowerCase()}`}>
            {b === "PLAYER" ? "🔵" : b === "BANKER" ? "🔴" : "🟡"}
          </span>
        ))}
      </div>
    </div>
  );
}
