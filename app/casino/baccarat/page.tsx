'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Phase = "BETTING" | "REVEAL" | "SETTLED";

type StatePayload = {
  round: number;
  phase: Phase;
  secLeft: number;
  result: null | {
    playerCards: { rank: number; suit: number }[];
    bankerCards: { rank: number; suit: number }[];
    playerTotal: number;
    bankerTotal: number;
    outcome: "PLAYER" | "BANKER" | "TIE";
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;
  };
  myBets: Record<string, number>;
  recent: { round: number; outcome: "PLAYER" | "BANKER" | "TIE"; p: number; b: number }[];
};

const SIDES: { key: string; label: string }[] = [
  { key: "PLAYER", label: "閒" },
  { key: "BANKER", label: "莊" },
  { key: "TIE", label: "和" },
  { key: "PLAYER_PAIR", label: "閒對" },
  { key: "BANKER_PAIR", label: "莊對" },
  { key: "ANY_PAIR", label: "任意對" },
  { key: "PERFECT_PAIR", label: "完美對" }
];

const CHIPS = [10, 50, 100, 500, 1000];

function suitIcon(s: number) {
  return ["♠", "♥", "♦", "♣"][s] || "?";
}
function rankText(r: number) {
  return ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"][r] || "?";
}

export default function Baccarat() {
  const [state, setState] = useState<StatePayload | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  const fetchState = async () => {
    try {
      const res = await fetch("/api/casino/baccarat/state", { cache: "no-store" });
      const data = await res.json();
      setState(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 1000);
    return () => clearInterval(t);
  }, []);

  const placeBet = async (side: string) => {
    if (!state) return;
    if (state.phase !== "BETTING") {
      setErr("現在不是下注時間");
      return;
    }
    setErr("");
    setPlacing(side);
    try {
      const res = await fetch("/api/casino/baccarat/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: chip })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "下注失敗");
      } else {
        fetchState(); // refresh my bets
      }
    } catch (e: any) {
      setErr("連線失敗");
    } finally {
      setPlacing(null);
    }
  };

  const countdown = state?.secLeft ?? 0;
  const phase = state?.phase ?? "BETTING";
  const round = state?.round ?? 0;

  const totalBet = useMemo(() => {
    return Object.values(state?.myBets || {}).reduce((a, b) => a + (b || 0), 0);
  }, [state]);

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">百家樂賭桌</h1>
          <div className="row">
            <Link href="/casino" className="btn-secondary btn">返回賭場</Link>
            <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
          </div>
        </div>

        <div className="grid">
          <div className="card col-6">
            <h3>本局資訊</h3>
            <div className="row" style={{justifyContent:'space-between'}}>
              <div>局號 <b>{round.toString().padStart(4, "0")}</b></div>
              <div>狀態 <b>{phase === "BETTING" ? "下注中" : phase === "REVEAL" ? "揭曉" : "結算"}</b></div>
              <div>倒數 <b>{countdown}s</b></div>
            </div>
            {state?.result && (
              <div className="mt16">
                <div className="row" style={{gap: 16}}>
                  <div>
                    <div className="subtle">閒牌</div>
                    <div>
                      {state.result.playerCards.map((c,i)=>(
                        <span key={i} style={{marginRight:8}}>
                          {rankText(c.rank)}{suitIcon(c.suit)}
                        </span>
                      ))}
                      （{state.result.playerTotal}）
                    </div>
                  </div>
                  <div>
                    <div className="subtle">莊牌</div>
                    <div>
                      {state.result.bankerCards.map((c,i)=>(
                        <span key={i} style={{marginRight:8}}>
                          {rankText(c.rank)}{suitIcon(c.suit)}
                        </span>
                      ))}
                      （{state.result.bankerTotal}）
                    </div>
                  </div>
                  <div>
                    <div className="subtle">結果</div>
                    <div><b>
                      {state.result.outcome === "PLAYER" ? "閒" :
                       state.result.outcome === "BANKER" ? "莊" : "和"}
                    </b></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card col-6">
            <h3>我的下注</h3>
            <div className="row" style={{flexWrap:'wrap', gap: 8}}>
              {SIDES.map(s=>(
                <div key={s.key} style={{minWidth:110}}>
                  <div className="subtle">{s.label}</div>
                  <div><b>{(state?.myBets?.[s.key] ?? 0).toLocaleString()}</b></div>
                </div>
              ))}
            </div>
            <div className="mt16 note">總計：<b>{totalBet.toLocaleString()}</b></div>
          </div>

          <div className="card col-12">
            <h3>選擇籌碼</h3>
            <div className="row">
              {CHIPS.map(c=>(
                <button key={c} className={`btn ${c===chip?'shimmer':''}`} onClick={()=>setChip(c)}>{c.toLocaleString()}</button>
              ))}
            </div>
          </div>

          <div className="card col-12">
            <h3>下注區</h3>
            <div className="row" style={{gap: 12, flexWrap:'wrap'}}>
              {SIDES.map(s=>(
                <button
                  key={s.key}
                  className={`btn ${placing===s.key?'shimmer':''}`}
                  disabled={phase!=="BETTING" || placing!==null}
                  onClick={()=>placeBet(s.key)}
                >
                  {s.label} +{chip.toLocaleString()}
                </button>
              ))}
            </div>
            {err && <div className="note mt16" style={{color:'#f87171'}}>{err}</div>}
          </div>

          <div className="card col-12">
            <h3>近10局</h3>
            <div className="row" style={{gap:10, flexWrap:'wrap'}}>
              {state?.recent?.map(r=>(
                <div key={r.round} className="note" style={{
                  padding:'8px 10px', border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:10, background:'rgba(255,255,255,0.03)'
                }}>
                  <b>{String(r.round).padStart(4,"0")}</b>：
                  {r.outcome==="PLAYER"?"閒":r.outcome==="BANKER"?"莊":"和"}
                  <span style={{opacity:.8}}>（{r.p}:{r.b}）</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
