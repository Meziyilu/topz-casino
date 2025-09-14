"use client";
import { useEffect, useRef, useState } from "react";
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

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);

  // Lottie 動畫引用
  const lottieRef = useRef<HTMLDivElement>(null);
  const lottieAnimRef = useRef<any>(null);

  // 每秒更新時間
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-TW")), 1000);
    return () => clearInterval(t);
  }, []);

  // 輪詢狀態
  useEffect(() => {
    const tick = async () => {
      const res = await fetch(`/api/casino/baccarat/state?room=${params.room}`);
      const data = await res.json();
      setState(data);
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [params.room]);

  // 拉下注流水
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/casino/baccarat/history?room=${params.room}&take=10`, {
        headers: { "x-user-id": "demo-user" },
      });
      const data = await res.json();
      setHistory(data.items || []);
    };
    fetchHistory();
  }, [params.room, state?.round?.id]);

  // 錢包餘額
  useEffect(() => {
    const fetchBalance = async () => {
      const res = await fetch("/api/wallet/balance", {
        headers: { "x-user-id": "demo-user" },
      });
      const data = await res.json();
      setBalance(data.wallet ?? 0);
    };
    fetchBalance();
  }, [state?.round?.id]);

  async function place(side: string, amt: number) {
    if (!state) return;
    setPlacing(true);
    await fetch("/api/casino/baccarat/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
      body: JSON.stringify({ room: params.room, roundId: state.round.id, side, amount: amt }),
    });
    setPlacing(false);
    setBets((prev) => ({ ...prev, [side]: (prev[side] || 0) + amt }));
  }

  // 翻牌動畫 class
  const revealClass = state?.round.phase === "REVEALING" ? "flip-cards" : "";

  // 勝利閃爍 class
  const winClass =
    state?.round.phase === "SETTLED" ? `winner-${state.table.outcome?.toLowerCase()}` : "";

  // 當局結算 → 播放 Lottie 動畫
  useEffect(() => {
    if (state?.round.phase === "SETTLED" && lottieRef.current) {
      (async () => {
        const lottie = (await import("lottie-web")) as any;
        if (lottieAnimRef.current) {
          lottieAnimRef.current.destroy();
        }
        lottieAnimRef.current = lottie.loadAnimation({
          container: lottieRef.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          path: "/lottie/baccarat-win.json",
        });
      })();
    }
  }, [state?.round.phase]);

  const betOptions: { side: string; label: string; odds: string }[] = [
    { side: "PLAYER", label: "閒", odds: "1倍" },
    { side: "BANKER", label: "莊", odds: "0.95倍" },
    { side: "TIE", label: "和", odds: "8倍" },
    { side: "PLAYER_PAIR", label: "閒對", odds: "11倍" },
    { side: "BANKER_PAIR", label: "莊對", odds: "11倍" },
    { side: "ANY_PAIR", label: "任意對", odds: "5倍" },
    { side: "PERFECT_PAIR", label: "完美對", odds: "25倍" },
    { side: "BANKER_SUPER_SIX", label: "莊超六", odds: "12倍" },
  ];

  return (
    <div className="baccarat-room dark-bg">
      <header className="room-header">
        <h1>百家樂 {params.room}</h1>
        <div>局號：{state?.round.seq ?? 0}</div>
        <div>狀態：{state?.round.phase}</div>
        <div>倒數：{state?.timers.endInSec ?? 0} 秒</div>
        <div>目前時間：{time}</div>
        <div>💰 錢包：{balance}</div>
      </header>

      {/* 翻牌區 */}
      <div className={`cards-area ${revealClass} ${winClass}`}>
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

      {/* 勝利特效 */}
      <div ref={lottieRef} className="lottie-win"></div>

      {/* 下注面板 */}
      <div className="betting-panel green-panel">
        {betOptions.map((opt) => (
          <button
            key={opt.side}
            disabled={state?.locked || placing}
            onClick={() => place(opt.side, 100)}
            className={
              state?.round.phase === "SETTLED" && state?.table.outcome === opt.side
                ? "glow"
                : ""
            }
          >
            {opt.label} {opt.odds} （{bets[opt.side] || 0}）
          </button>
        ))}
      </div>

      {/* 路子 */}
      <div className="bead-road">
        {state?.bead.map((b, i) => (
          <span key={i} className={`dot ${b.toLowerCase()}`}>
            {b === "PLAYER" ? "🔵" : b === "BANKER" ? "🔴" : "🟡"}
          </span>
        ))}
      </div>

      {/* 近 10 局下注流水 */}
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
