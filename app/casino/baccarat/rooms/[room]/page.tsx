"use client";

import { useEffect, useState } from "react";
import "@/../public/styles/baccarat.css";

type RoomCode = "R30" | "R60" | "R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

interface RoundState {
  id: string;
  seq: number;
  phase: Phase;
  startedAt: string;
  endsAt: string;
  resultJson?: string;
}

interface StateResp {
  room: RoomCode;
  round: RoundState;
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
  table: {
    banker: number[];
    player: number[];
    bankerThird?: number;
    playerThird?: number;
    total?: { player: number; banker: number };
    outcome?: "PLAYER" | "BANKER" | "TIE";
  };
  bead: ("PLAYER" | "BANKER" | "TIE")[];
}

interface Bet {
  id: string;
  side: string;
  amount: number;
}

// 中文下注項目 + 顯示用賠率（說明用途）
const BET_OPTIONS: {
  key:
    | "PLAYER"
    | "BANKER"
    | "TIE"
    | "PLAYER_PAIR"
    | "BANKER_PAIR"
    | "ANY_PAIR"
    | "PERFECT_PAIR"
    | "BANKER_SUPER_SIX";
  label: string;
  odds: string;
}[] = [
  { key: "PLAYER", label: "閒", odds: "1:1" },
  { key: "BANKER", label: "莊", odds: "1:0.95" }, // 顯示常見抽水
  { key: "TIE", label: "和", odds: "1:8" },
  { key: "PLAYER_PAIR", label: "閒對", odds: "1:11" },
  { key: "BANKER_PAIR", label: "莊對", odds: "1:11" },
  { key: "ANY_PAIR", label: "任一對", odds: "1:5" },
  { key: "PERFECT_PAIR", label: "完美對", odds: "1:25" },
  { key: "BANKER_SUPER_SIX", label: "超級六", odds: "1:12" }, // 常見 12 倍
];

function phaseText(p?: Phase) {
  if (p === "BETTING") return "下注中";
  if (p === "REVEALING") return "開獎中";
  if (p === "SETTLED") return "已結算";
  return "-";
}

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState<string>("");

  // 每秒更新時間
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-TW")), 1000);
    return () => clearInterval(t);
  }, []);

  // 輪詢狀態
  useEffect(() => {
    const tick = async () => {
      const res = await fetch(`/api/casino/baccarat/state?room=${params.room}`, { cache: "no-store" });
      const data = await res.json();
      setState(data);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [params.room]);

  // 拉下注流水（近 10 局）
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/casino/baccarat/history?room=${params.room}&take=10`, {
        headers: { "x-user-id": "demo-user" },
        cache: "no-store",
      });
      const data = await res.json();
      setHistory(data.items || []);
    };
    fetchHistory();
  }, [params.room, state?.round?.id]);

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

  // 翻牌動畫 class
  const revealClass = state?.round.phase === "REVEALING" ? "flip-cards" : "";

  // 勝利閃爍 class（莊/閒/和）
  const winClass =
    state?.round.phase === "SETTLED" ? `winner-${state.table.outcome?.toLowerCase()}` : "";

  return (
    <div className="baccarat-room">
      <header>
        <h1>百家樂 {params.room}</h1>
        <div>局號：{state?.round.seq ?? 0}</div>
        <div>狀態：{phaseText(state?.round.phase)}</div>
        <div>倒數：{state?.timers.endInSec ?? 0} 秒</div>
        <div>目前時間：{time}</div>
      </header>

      {/* 翻牌區 */}
      <div className={`cards-area ${revealClass} ${winClass}`}>
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

      {/* 下注面板（中文 + 賠率） */}
      <div className="betting-panel">
        {BET_OPTIONS.map(({ key, label, odds }) => (
          <button
            key={key}
            disabled={state?.locked || placing}
            onClick={() => place(key, 100)}
            className="bet-btn"
            title={`${label}（賠率 ${odds}）`}
          >
            <div className="bet-label">{label}</div>
            <div className="bet-odds">賠率 {odds}</div>
            <div className="bet-amt">已下：{bets[key] || 0}</div>
          </button>
        ))}
      </div>

      {/* 珠盤路（🔵🟡🔴） */}
      <div className="bead-road">
        {state?.bead.map((b, i) => (
          <span key={i} className={`dot ${b.toLowerCase()}`}>
            {b === "PLAYER" ? "🔵" : b === "BANKER" ? "🔴" : "🟡"}
          </span>
        ))}
      </div>

      {/* 近 10 局下注流水（示意） */}
      <div className="history">
        <h3>近 10 局下注與派彩</h3>
        {history.map((h, i) => (
          <div key={i} className="history-item">
            <div>局號 {h.seq}</div>
            <div>下注 {h.bets.map((b: Bet) => `${b.side}:${b.amount}`).join(", ")}</div>
            <div>派彩 {h.payouts.map((p: any) => p.amount).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
