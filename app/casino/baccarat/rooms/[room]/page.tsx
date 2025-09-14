"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [time, setTime] = useState<string>("");

  // 平滑倒數：用伺服器的 endInSec/lockInSec 換算成「絕對時間戳」
  const serverEndAtRef = useRef<number | null>(null);
  const serverLockAtRef = useRef<number | null>(null);
  const [displayLockSec, setDisplayLockSec] = useState(0);
  const [displayEndSec, setDisplayEndSec] = useState(0);

  // Lottie：載入 /public/lotties/baccarat-win.json（不需把 JSON 貼進來）
  const [winAnimData, setWinAnimData] = useState<any>(null);
  const [showWinAnim, setShowWinAnim] = useState(false);

  useEffect(() => {
    // 每秒更新「目前時間」
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-TW")), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // 載入 Lottie 檔案（放在 /public/lotties/baccarat-win.json）
    fetch("/lotties/baccarat-win.json")
      .then((r) => r.json())
      .then(setWinAnimData)
      .catch(() => setWinAnimData(null));
  }, []);

  // 拉狀態（每 2 秒）
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const res = await fetch(`/api/casino/baccarat/state?room=${params.room}`);
      const data: StateResp = await res.json();

      if (!mounted) return;

      setState((prev) => {
        // 從非 SETTLED → SETTLED 時，播勝利動畫
        if (prev?.round.phase !== "SETTLED" && data.round.phase === "SETTLED") {
          setShowWinAnim(true);
          // 3.2 秒後關閉（可自行調整）
          setTimeout(() => setShowWinAnim(false), 3200);
        }
        return data;
      });

      // 同步伺服器「絕對時間」
      const now = Date.now();
      serverEndAtRef.current = now + data.timers.endInSec * 1000;
      serverLockAtRef.current = now + data.timers.lockInSec * 1000;
    };

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [params.room]);

  // 平滑倒數刷新（每 100ms）
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (serverEndAtRef.current) {
        const remain = Math.max(0, serverEndAtRef.current - now);
        setDisplayEndSec(Math.ceil(remain / 1000));
      }
      if (serverLockAtRef.current) {
        const remain = Math.max(0, serverLockAtRef.current - now);
        setDisplayLockSec(Math.ceil(remain / 1000));
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  // 下單
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

  const outcome = state?.table.outcome; // "PLAYER" | "BANKER" | "TIE" | undefined
  const settled = state?.round.phase === "SETTLED";

  // 下注按鈕中文標籤 + 賠率（示意，可自行調整）
  const betOptions: { key: string; label: string; odds?: string }[] = [
    { key: "PLAYER", label: "閒", odds: "1:1" },
    { key: "BANKER", label: "莊", odds: "1:0.95" },
    { key: "TIE", label: "和", odds: "1:8" },
    { key: "PLAYER_PAIR", label: "閒對", odds: "1:11" },
    { key: "BANKER_PAIR", label: "莊對", odds: "1:11" },
    { key: "ANY_PAIR", label: "任意對", odds: "1:5" },
    { key: "PERFECT_PAIR", label: "完美對", odds: "1:25" },
    { key: "BANKER_SUPER_SIX", label: "超級六(莊6點)", odds: "1:12" },
  ];

  return (
    <div className="baccarat-room">
      <header className="room-header">
        <h1>百家樂 {params.room}</h1>
        <div className="inline-stats">
          <span>局號：{state?.round.seq ?? 0}</span>
          <span>狀態：{state?.round.phase ?? "-"}</span>
          <span>封盤倒數：{displayLockSec} 秒</span>
          <span>本局結束：{displayEndSec} 秒</span>
          <span>目前時間：{time}</span>
        </div>
      </header>

      {/* 翻牌區（你既有的翻牌動畫 class 可以保留） */}
      <div
        className={`cards-area ${
          state?.round.phase === "REVEALING" ? "flip-cards" : ""
        } ${settled && outcome ? `winner-${outcome.toLowerCase()}` : ""}`}
      >
        <div className="side player">
          <h2>閒</h2>
          <div className="cards">
            {state?.table.player.map((c, i) => (
              <div key={i} className="card">
                {c}
              </div>
            ))}
          </div>
        </div>
        <div className="side banker">
          <h2>莊</h2>
          <div className="cards">
            {state?.table.banker.map((c, i) => (
              <div key={i} className="card">
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 勝利 Lottie 動畫（全畫面疊加） */}
      {showWinAnim && winAnimData && (
        <div className="win-lottie-overlay">
          <Lottie animationData={winAnimData} loop={false} autoplay />
        </div>
      )}

      {/* 下注面板（勝利閃光） */}
      <div className="betting-panel">
        {betOptions.map((o) => {
          // 只對主要三門做勝利閃光：PLAYER/BANKER/TIE
          const glow =
            settled &&
            (o.key === "PLAYER" || o.key === "BANKER" || o.key === "TIE") &&
            outcome === (o.key as any)
              ? "glow-win"
              : "";
        return (
            <button
              key={o.key}
              className={`bet-btn ${o.key.toLowerCase()} ${glow}`}
              disabled={state?.locked || placing}
              onClick={() => place(o.key, 100)}
              title={o.odds ? `賠率 ${o.odds}` : undefined}
            >
              <div className="bet-label">
                <span className="name">{o.label}</span>
                {o.odds && <span className="odds">{o.odds}</span>}
              </div>
              <div className="bet-amount">已押：{bets[o.key] || 0}</div>
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
