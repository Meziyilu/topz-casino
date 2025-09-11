"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Roadmap from "@/components/sicbo/Roadmap";

type Phase = "BETTING" | "REVEALING" | "SETTLED";
type SicboRoomCode = "SB_R30" | "SB_R60" | "SB_R90";

type StateApi = {
  room: SicboRoomCode;
  round: { id: string; phase: Phase; dice: number[] };
  timers: { lockInSec: number; endInSec: number };
  locked: boolean;
};

type HistoryApi = {
  room: SicboRoomCode;
  items: { id: string; dice: number[]; endedAt: string }[];
};

type MeApi = {
  ok: boolean;
  user?: { id: string; balance: number };
};

function sum(d: number[]) {
  return (d[0] || 0) + (d[1] || 0) + (d[2] || 0);
}
function isTriple(d: number[]) {
  return d[0] === d[1] && d[1] === d[2];
}

export default function SicboRoomPage() {
  const { room } = useParams<{ room: string }>();
  const [state, setState] = useState<StateApi | null>(null);
  const [history, setHistory] = useState<HistoryApi["items"]>([]);
  const [winners, setWinners] = useState<string[]>([]);
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [placing, setPlacing] = useState(false);
  const tickRef = useRef<number | null>(null);

  async function load() {
    const rs = await fetch(`/api/casino/sicbo/state?room=${room}`, { cache: "no-store" });
    const st: StateApi = await rs.json();

    const rh = await fetch(`/api/casino/sicbo/history?room=${room}&limit=12`, { cache: "no-store" });
    const hist: HistoryApi = await rh.json();

    const meRes = await fetch(`/api/users/me`, { cache: "no-store" });
    const me: MeApi = await meRes.json();

    setState(st);
    setHistory(hist.items);
    if (me.ok && me.user) setBalance(me.user.balance);

    if (st.round.phase === "SETTLED" && st.round.dice?.length === 3) {
      const s = sum(st.round.dice);
      const triple = isTriple(st.round.dice);
      const winners: string[] = [];

      if (s >= 11) winners.push("BIG");
      else winners.push("SMALL");

      if (s % 2 === 0) winners.push("EVEN");
      else winners.push("ODD");

      winners.push(`TOTAL-${s}`);
      if (triple) winners.push("ANY_TRIPLE");

      setWinners(winners);

      setTimeout(() => setWinners([]), 3000);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 4000);
    return () => clearInterval(poll);
  }, [room]);

  const rolling = state?.round?.phase === "REVEALING";

  async function placeBet(kind: string, payload?: any) {
    if (!state || placing) return;
    setPlacing(true);
    try {
      const res = await fetch(`/api/casino/sicbo/bet`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room,
          kind,
          amount: betAmount,
          payload,
        }),
      });
      const j = await res.json();
      if (j.ok) {
        setBalance(j.wallet); // 後端返回新餘額
      } else {
        alert(j.error || "下注失敗");
      }
    } catch (e) {
      alert("NETWORK_ERROR");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="sicbo-wrapper">
      {/* Topbar */}
      <div className="topbar glass flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="left">
          <span className="room-pill">{room}</span>
        </div>
        <div className="right text-sm flex gap-4 flex-wrap">
          <span>餘額: <b>{balance}</b></span>
          <span>Round: {state?.round?.id?.slice(-6) || "-"}</span>
          <span>Phase: {state?.round?.phase}</span>
          <span>倒數: {state?.timers?.lockInSec}s</span>
        </div>
      </div>

      {/* 骰子 */}
      <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
        {state?.round?.dice?.map((d, i) => (
          <div key={i} className={`dice face-${d} ${rolling ? "rolling" : ""}`}>
            <span className="pip p1" /><span className="pip p2" /><span className="pip p3" />
            <span className="pip p4" /><span className="pip p5" /><span className="pip p6" />
            <span className="pip p7" /><span className="pip p8" /><span className="pip p9" />
          </div>
        ))}
      </div>

      {/* 下注面板 */}
      <div className="table-outer">
        <div className="table-grid">
          <div
            onClick={() => placeBet("SMALL")}
            className={`tile big-left cursor-pointer ${winners.includes("SMALL") ? "winner" : ""}`}
          >
            <div className="badge">SMALL</div>
            <div className="cn">小</div>
          </div>

          <div className="mid-14">
            {Array.from({ length: 14 }, (_, i) => i + 4).map((n) => (
              <div
                key={n}
                onClick={() => placeBet("TOTAL", { value: n })}
                className={`sicbo-cell total cursor-pointer ${winners.includes(`TOTAL-${n}`) ? "winner" : ""}`}
              >
                <div className="total-num">{n}</div>
                <div className="total-odd">{n % 2 === 0 ? "雙" : "單"}</div>
              </div>
            ))}
          </div>

          <div
            onClick={() => placeBet("BIG")}
            className={`tile big-right cursor-pointer ${winners.includes("BIG") ? "winner" : ""}`}
          >
            <div className="badge">BIG</div>
            <div className="cn">大</div>
          </div>
        </div>

        <div className="row-two">
          <div
            onClick={() => placeBet("ODD")}
            className={`sicbo-cell cursor-pointer ${winners.includes("ODD") ? "winner" : ""}`}
          >
            <div className="h1">單</div>
          </div>
          <div
            onClick={() => placeBet("EVEN")}
            className={`sicbo-cell cursor-pointer ${winners.includes("EVEN") ? "winner" : ""}`}
          >
            <div className="h1">雙</div>
          </div>
        </div>

        <div className="row-multi mt-4">
          <div
            onClick={() => placeBet("ANY_TRIPLE")}
            className={`sicbo-cell any-triple cursor-pointer ${winners.includes("ANY_TRIPLE") ? "winner" : ""}`}
          >
            任意豹子
          </div>
        </div>
      </div>

      {/* 底部工具條：下注金額選擇 */}
      <div className="toolbar flex justify-between items-center">
        <div className="amount">
          <span className="label">下注金額</span>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="chips">
          <span className="chips-label">快速籌碼:</span>
          {[10, 100, 1000, 5000].map((c) => (
            <button key={c} className={`chip chip-${c}`} onClick={() => setBetAmount(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 路子圖 */}
      <Roadmap history={history} />
    </div>
  );
}
