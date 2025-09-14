"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

interface HistoryItem {
  id: string;
  seq: number;
  startedAt: string;
  outcome: "PLAYER" | "BANKER" | "TIE" | null;
  result: any;
  // 若你的 history 接口有附下注與派彩，保留以下兩行；沒有的會顯示「—」
  bets?: { side: string; amount: number }[];
  payouts?: { amount: number }[];
}

const LOTTIE_SRC = "/lottie/baccarat-win.json"; // 放 public/lottie/baccarat-win.json
const USER_HEADER = { "x-user-id": "demo-user" };

// 中文面板與賠率
const SIDE_LABEL: Record<string, string> = {
  PLAYER: "閒",
  BANKER: "莊",
  TIE: "和",
  PLAYER_PAIR: "閒對",
  BANKER_PAIR: "莊對",
  ANY_PAIR: "任意對",
  PERFECT_PAIR: "完美對",
  BANKER_SUPER_SIX: "超級六",
};

const SIDE_ODDS: Record<string, string> = {
  PLAYER: "1",
  BANKER: "0.95",
  TIE: "8",
  PLAYER_PAIR: "11",
  BANKER_PAIR: "11",
  ANY_PAIR: "5",
  PERFECT_PAIR: "25",
  BANKER_SUPER_SIX: "0.5", // 1:0.5 (莊家 6 點贏)
};

// 面板順序
const SIDES = [
  "PLAYER",
  "BANKER",
  "TIE",
  "PLAYER_PAIR",
  "BANKER_PAIR",
  "ANY_PAIR",
  "PERFECT_PAIR",
  "BANKER_SUPER_SIX",
] as const;

export default function BaccaratRoomPage({ params }: { params: { room: RoomCode } }) {
  const [state, setState] = useState<StateResp | null>(null);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [chip, setChip] = useState<number>(100);
  const [smoothCountdown, setSmoothCountdown] = useState<number>(0);
  const [time, setTime] = useState<string>("");

  // Lottie
  const lottieRef = useRef<HTMLDivElement | null>(null);
  const lottieAnimRef = useRef<any>(null);

  // ====== 時鐘（現場時間顯示）======
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("zh-TW")), 1000);
    return () => clearInterval(t);
  }, []);

  // ====== 讀錢包餘額 ======
  async function fetchWallet() {
    try {
      const r = await fetch("/api/wallet/balances", { headers: USER_HEADER });
      const d = await r.json();
      setWallet(d.wallet ?? 0);
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    fetchWallet();
  }, []);

  // ====== 狀態輪詢（2 秒）======
  useEffect(() => {
    let stop = false;

    async function tick() {
      try {
        const res = await fetch(`/api/casino/baccarat/state?room=${params.room}`, { headers: USER_HEADER });
        const data = (await res.json()) as StateResp;
        if (!stop) setState(data);
      } catch {
        // ignore
      }
    }

    tick();
    const id = setInterval(tick, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [params.room]);

  // ====== 平滑倒數（每 100ms）======
  useEffect(() => {
    if (!state?.round?.endsAt) return;
    let raf = 0;
    let stop = false;

    const endsAt = new Date(state.round.endsAt).getTime();
    const loop = () => {
      if (stop) return;
      const leftMs = Math.max(0, endsAt - Date.now());
      setSmoothCountdown(leftMs / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
  }, [state?.round?.endsAt]);

  // ====== 歷史（近 10 局）======
  useEffect(() => {
    let stop = false;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/casino/baccarat/history?room=${params.room}&take=10`, {
          headers: USER_HEADER,
        });
        const data = await res.json();
        if (!stop) setHistory(data.items || data || []);
      } catch {
        // ignore
      }
    }
    fetchHistory();
    return () => {
      stop = true;
    };
  }, [params.room, state?.round?.id]);

  // ====== 勝利動畫與面板發光 ======
  const outcome = state?.table.outcome; // PLAYER / BANKER / TIE
  const phase = state?.round.phase;

  // 播放 Lottie（進入 SETTLED 才播一次）
  const prevPhaseRef = useRef<Phase | null>(null);
  useEffect(() => {
    if (!phase) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const shouldPlay = prev !== "SETTLED" && phase === "SETTLED" && outcome;
    if (!shouldPlay) return;

    // lazy import lottie-web
    (async () => {
      try {
        const lottie = await import("lottie-web");
        if (lottieAnimRef.current) {
          lottieAnimRef.current.destroy();
          lottieAnimRef.current = null;
        }
        if (lottieRef.current) {
          lottieAnimRef.current = lottie.loadAnimation({
            container: lottieRef.current,
            renderer: "svg",
            loop: false,
            autoplay: true,
            path: LOTTIE_SRC,
          });
        }
      } catch {
        // ignore if lottie not available
      }
    })();
  }, [phase, outcome]);

  // ====== 下單 ======
  async function place(side: string, amt: number) {
    if (!state || !state.round) return;
    setPlacing(true);
    try {
      await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...USER_HEADER },
        body: JSON.stringify({ room: params.room, roundId: state.round.id, side, amount: amt }),
      });
      // 本地顯示下注累積
      setBets((prev) => ({ ...prev, [side]: (prev[side] || 0) + amt }));
      // 下注成功後更新錢包
      fetchWallet();
    } finally {
      setPlacing(false);
    }
  }

  // 開牌動畫 class
  const revealClass = state?.round.phase === "REVEALING" ? "flip-cards reveal-gold" : "";

  // 勝利閃爍 class（區塊）
  const winClass =
    state?.round.phase === "SETTLED"
      ? outcome === "PLAYER"
        ? "winner-player"
        : outcome === "BANKER"
        ? "winner-banker"
        : "winner-tie"
      : "";

  // 中文狀態
  const phaseLabel = {
    BETTING: "下注中",
    REVEALING: "開牌中",
    SETTLED: "結算完成",
  }[state?.round.phase ?? "BETTING"];

  // 勝利面板發光（按鈕）
  function sideBtnClass(side: string) {
    const base = "bet-btn";
    if (phase === "SETTLED") {
      if (outcome === "PLAYER" && side === "PLAYER") return base + " glow-win";
      if (outcome === "BANKER" && side === "BANKER") return base + " glow-win";
      if (outcome === "TIE" && side === "TIE") return base + " glow-win";
    }
    return base;
  }

  // 倒數文案（保留 1 位小數）
  const countdownText = useMemo(() => {
    const s = smoothCountdown;
    return s > 0 ? `${s.toFixed(1)} 秒` : "0.0 秒";
  }, [smoothCountdown]);

  return (
    <div className="dark-theme">
      {/* 勝利特效 Overlay（Lottie） */}
      <div className="win-fx-overlay" aria-hidden>
        <div ref={lottieRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* 頁首：標題 + 錢包 + 籌碼選擇 */}
      <header className="room-header">
        <div className="title">
          <h1>百家樂 {params.room}</h1>
          <span>
            局號：{state?.round.seq ?? 0} ｜ 狀態：{phaseLabel} ｜ 倒數：{countdownText} ｜ 現在：{time}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="wallet">錢包餘額：{wallet.toLocaleString()} 元</div>
          <div className="chips">
            {[100, 200, 500, 1000, 5000].map((c) => (
              <button
                key={c}
                className={`chip ${chip === c ? "active" : ""}`}
                onClick={() => setChip(c)}
              >
                ${c}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 開牌區 */}
      <div className={`cards-area ${revealClass} ${winClass}`}>
        <div className="side player">
          <h2>閒</h2>
          <div className="cards">
            {(state?.table.player ?? []).map((c, i) => (
              <div key={i} className="card">
                {c}
              </div>
            ))}
          </div>
        </div>

        <div className="side banker">
          <h2>莊</h2>
          <div className="cards">
            {(state?.table.banker ?? []).map((c, i) => (
              <div key={i} className="card">
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下注面板（綠底、中文 + 賠率） */}
      <div className="betting-panel green-panel">
        {SIDES.map((side) => {
          const disabled = state?.locked || placing || !state?.round?.id;
          return (
            <button
              key={side}
              disabled={!!disabled}
              className={sideBtnClass(side)}
              onClick={() => place(side, chip)}
              title={`${SIDE_LABEL[side]} 賠率 ${SIDE_ODDS[side]}`}
            >
              {SIDE_LABEL[side]} <small>（賠 {SIDE_ODDS[side]}）</small>
              <span className="amt">本局投注：{(bets[side] || 0).toLocaleString()} 元</span>
            </button>
          );
        })}
      </div>

      {/* 珠盤（🔵🟡🔴） */}
      <div className="bead-road">
        {(state?.bead ?? []).map((b, i) => (
          <span key={i} className={`dot ${b.toLowerCase()}`}>
            {b === "PLAYER" ? "🔵" : b === "BANKER" ? "🔴" : "🟡"}
          </span>
        ))}
      </div>

      {/* 近 10 局 注單/派彩 卡片式 UI */}
      <section className="history">
        <h3>近 10 局下注與派彩</h3>
        <div className="history-list">
          {history.length === 0 && (
            <div className="history-card">
              <div className="round-id">暫無資料</div>
            </div>
          )}
          {history.map((h) => {
            const outcomeText =
              h.outcome === "PLAYER" ? "閒" : h.outcome === "BANKER" ? "莊" : h.outcome === "TIE" ? "和" : "—";
            const betsText =
              h.bets && h.bets.length
                ? h.bets.map((b) => `${SIDE_LABEL[b.side] ?? b.side}:${b.amount}`).join("，")
                : "—";
            const payoutsText =
              h.payouts && h.payouts.length ? h.payouts.map((p) => p.amount).join("，") : "—";

            return (
              <div key={h.id} className="history-card">
                <div className="round-id">
                  第 {h.seq} 局　｜　結果：{outcomeText}
                </div>
                <div className="bets">下注：{betsText}</div>
                <div className="payouts">派彩：{payoutsText}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
