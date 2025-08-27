'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

type Phase = "BETTING" | "REVEAL" | "SETTLED";
type Outcome = "PLAYER" | "BANKER" | "TIE";

type StatePayload = {
  roomSec: 30|60|90;
  round: number;
  phase: Phase;
  secLeft: number;
  result: null | {
    playerCards: { rank: number; suit: number }[];
    bankerCards: { rank: number; suit: number }[];
    playerTotal: number;
    bankerTotal: number;
    outcome: Outcome;
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;
  };
  myBets: Record<string, number>;
  recent: { round: number; outcome: Outcome; p: number; b: number }[];
  serverTime: number;
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

function suitIcon(s: number) { return ["♠", "♥", "♦", "♣"][s] || "?"; }
function rankText(r: number) { return ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"][r] || "?"; }

function outcomeColor(o: Outcome) {
  return o==="PLAYER" ? "#60a5fa" : o==="BANKER" ? "#f87171" : "#fbbf24";
}

export default function BaccaratRoomPage() {
  const params = useParams<{room: string}>();
  const roomSec = (params.room === "30" || params.room === "90") ? Number(params.room) as 30|90 : 60;

  const [state, setState] = useState<StatePayload | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");
  const [now, setNow] = useState<Date>(new Date());

  const fetchState = async () => {
    const res = await fetch(`/api/casino/baccarat/state?room=${roomSec}`, { cache: "no-store" });
    const data = await res.json();
    setState(data);
  };

  // 定時更新：每 1 秒刷新狀態；同時本地時鐘每秒跳動
  useEffect(() => {
    fetchState();
    const t1 = setInterval(fetchState, 1000);
    const t2 = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [roomSec]);

  const placeBet = async (side: string) => {
    if (!state) return;
    if (state.phase !== "BETTING") { setErr("現在不是下注時間"); return; }
    setErr("");
    setPlacing(side);
    try {
      const res = await fetch(`/api/casino/baccarat/bet?room=${roomSec}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: chip })
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error || "下注失敗");
      else fetchState();
    } catch { setErr("連線失敗"); }
    finally { setPlacing(null); }
  };

  const totalBet = useMemo(() =>
    Object.values(state?.myBets || {}).reduce((a, b) => a + (b || 0), 0)
  , [state]);

  // 揭牌動畫：在 REVEAL 期時給卡片翻轉 class
  const reveal = state?.phase === "REVEAL" && !!state?.result;

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">百家樂 {roomSec}s 房</h1>
          <div className="row">
            <Link href="/casino" className="btn-secondary btn">返回賭場</Link>
            <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
          </div>
        </div>

        <div className="grid">
          <div className="card col-12">
            <div className="row space-between">
              <div>現在時間：<b>{now.toLocaleString()}</b></div>
              <div>局號：<b>{(state?.round ?? 0).toString().padStart(4,"0")}</b></div>
              <div>狀態：<b>{state?.phase === "BETTING" ? "下注中" : state?.phase === "REVEAL" ? "揭曉" : "結算"}</b></div>
              <div>倒數：<b>{state?.secLeft ?? 0}s</b></div>
            </div>
          </div>

          {/* 揭牌區 + 動畫 */}
          <div className="card col-12">
            <h3>開牌</h3>
            {state?.result ? (
              <div className="row" style={{gap: 24, alignItems: "center"}}>
                <div>
                  <div className="subtle">閒牌（{state.result.playerTotal}）</div>
                  <div className={`cards ${reveal ? "reveal" : ""}`}>
                    {state.result.playerCards.map((c,i)=>(
                      <div key={i} className="cardflip">
                        <div className="front"></div>
                        <div className="back">{rankText(c.rank)}{suitIcon(c.suit)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="subtle">莊牌（{state.result.bankerTotal}）</div>
                  <div className={`cards ${reveal ? "reveal" : ""}`}>
                    {state.result.bankerCards.map((c,i)=>(
                      <div key={i} className="cardflip">
                        <div className="front"></div>
                        <div className="back">{rankText(c.rank)}{suitIcon(c.suit)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="subtle">結果</div>
                  <div style={{fontWeight:800, fontSize:24, color: state.result ? outcomeColor(state.result.outcome) : "#fff"}}>
                    {state.result.outcome === "PLAYER" ? "閒" : state.result.outcome === "BANKER" ? "莊" : "和"}
                  </div>
                </div>
              </div>
            ) : <div className="note">下注期間，等待揭曉…</div>}
          </div>

          {/* 我的下注 + 籌碼 + 下注區 */}
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

          <div className="card col-6">
            <h3>選擇籌碼</h3>
            <div className="row">
              {CHIPS.map(c=>(
                <button key={c} className={`btn ${c===chip?'shimmer':''}`} onClick={()=>setChip(c)}>
                  {c.toLocaleString()}
                </button>
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
                  disabled={(state?.phase!=="BETTING") || placing!==null}
                  onClick={()=>placeBet(s.key)}
                >
                  {s.label} +{chip.toLocaleString()}
                </button>
              ))}
            </div>
            {err && <div className="note mt16" style={{color:'#f87171'}}>{err}</div>}
          </div>

          {/* 路子（近 24 局：珠盤路樣式） */}
          <div className="card col-12">
            <h3>路子（近24局）</h3>
            <div className="bead-grid">
              {(state?.recent || []).map((r, idx)=>(
                <div key={idx} className="bead" title={`#${r.round} ${r.outcome} (${r.p}:${r.b})`}
                  style={{ background: outcomeColor(r.outcome) }}>
                </div>
              ))}
            </div>
            <div className="note mt16">顏色：藍=閒、紅=莊、黃=和</div>
          </div>
        </div>

      </div>
    </div>
  );
}
