'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/** ===== 型別 ===== */
type Phase = "BETTING" | "REVEAL" | "SETTLED";
type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR" | "ANY_PAIR" | "PERFECT_PAIR";
type RoomCode = "R30" | "R60" | "R90";
type RoomInfo = { code: RoomCode; name: string; durationSeconds: number };

type Card = { rank: number; suit: number };

type StatePayload = {
  room: RoomInfo;
  day: string;
  roundSeq: number;
  phase: Phase;
  secLeft: number;
  result: null | {
    playerCards: Card[];
    bankerCards: Card[];
    playerTotal: number;
    bankerTotal: number;
    outcome: "PLAYER" | "BANKER" | "TIE";
    playerPair: boolean;
    bankerPair: boolean;
    anyPair: boolean;
    perfectPair: boolean;
  };
  myBets: Record<string, number>;
  recent: { roundSeq: number; outcome: "PLAYER" | "BANKER" | "TIE"; p: number; b: number }[];
};

const SIDES: { key: BetSide; label: string }[] = [
  { key: "PLAYER",        label: "閒"    },
  { key: "BANKER",        label: "莊"    },
  { key: "TIE",           label: "和"    },
  { key: "PLAYER_PAIR",   label: "閒對"  },
  { key: "BANKER_PAIR",   label: "莊對"  },
  { key: "ANY_PAIR",      label: "任意對"},
  { key: "PERFECT_PAIR",  label: "完美對"},
];

const CHIPS = [10, 50, 100, 500, 1000];

function suitIcon(s: number) { return ["♠","♥","♦","♣"][s] || "?"; }
function isRedSuit(s: number) { return s === 1 || s === 2; }
function rankText(r: number) { return ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"][r] || "?"; }

/** 百家樂點數（A=1；2~9=面值；10/J/Q/K=0；總和取尾數） */
function baccaratValue(rank: number) {
  if (rank === 1) return 1;        // A
  if (rank >= 2 && rank <= 9) return rank;
  return 0;                         // 10/J/Q/K
}
function baccaratTotal(cards: Card[], count?: number) {
  const n = (typeof count === 'number') ? Math.max(0, Math.min(count, cards.length)) : cards.length;
  const sum = cards.slice(0, n).reduce((a, c) => a + baccaratValue(c.rank), 0);
  return sum % 10;
}

/** ===== 主頁面 ===== */
export default function BaccaratRoomPage() {
  const params = useParams<{ room: RoomCode }>();
  const code: RoomCode = (params?.room?.toUpperCase() as RoomCode) || "R60";

  const [state, setState] = useState<StatePayload | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<BetSide | null>(null);
  const [err, setErr] = useState<string>("");
  const [wallet, setWallet] = useState<{wallet: number; bank: number}>({wallet:0, bank:0});

  // 逐張翻牌控制：目前已翻開幾張（依序）
  const [revealedCount, setRevealedCount] = useState(0);

  // 拉狀態
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${code}`, { cache: "no-store" });
      const data = await res.json();
      setState(data);
    } catch {}
  };
  // 拉錢包
  const fetchWallet = async () => {
    try {
      const r = await fetch(`/api/wallet`, { cache: "no-store" });
      if (r.ok) setWallet(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchState(); fetchWallet();
    const t1 = setInterval(fetchState, 1000);
    const t2 = setInterval(fetchWallet, 4000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [code]);

  // 進入不同階段時的翻牌邏輯
  useEffect(() => {
    if (state?.phase === "BETTING") {
      setRevealedCount(0);
      return;
    }
    if (state?.phase === "REVEAL" && state.result) {
      setRevealedCount(0);
      const total = (state.result.playerCards?.length || 0) + (state.result.bankerCards?.length || 0);
      for (let i = 0; i < total; i++) {
        setTimeout(() => setRevealedCount(prev => prev + 1), i * 900);
      }
    }
  }, [state?.phase, state?.roundSeq]);

  // 下單
  const placeBet = async (side: BetSide) => {
    if (!state) return;
    if (state.phase !== "BETTING") { setErr("現在不是下注時間"); return; }
    setErr(""); setPlacing(side);
    try {
      const res = await fetch(`/api/casino/baccarat/bet?room=${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: chip })
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error || "下注失敗");
      else { fetchState(); fetchWallet(); }
    } catch {
      setErr("連線失敗");
    } finally {
      setPlacing(null);
    }
  };

  const countdown = state?.secLeft ?? 0;
  const phase = state?.phase ?? "BETTING";
  const roundSeq = state?.roundSeq ?? 0;
  const playerCards = state?.result?.playerCards || [];
  const bankerCards = state?.result?.bankerCards || [];

  /** 即時點數：REVEAL 期間用「已翻的牌」計算；SETTLED 用後端最終值；BETTING 顯示 "--" */
  const livePlayerTotal = useMemo(() => {
    if (!state?.result) return "--";
    if (phase === "REVEAL") {
      const n = Math.min(revealedCount, playerCards.length);
      return baccaratTotal(playerCards, n).toString();
    }
    if (phase === "SETTLED") return String(state.result.playerTotal ?? 0);
    return "--";
  }, [state?.result, phase, revealedCount, playerCards]);

  const liveBankerTotal = useMemo(() => {
    if (!state?.result) return "--";
    if (phase === "REVEAL") {
      const revealedOnBanker = Math.max(0, revealedCount - playerCards.length);
      const n = Math.min(revealedOnBanker, bankerCards.length);
      return baccaratTotal(bankerCards, n).toString();
    }
    if (phase === "SETTLED") return String(state.result.bankerTotal ?? 0);
    return "--";
  }, [state?.result, phase, revealedCount, playerCards.length, bankerCards]);

  const totalBet = useMemo(
    () => Object.values(state?.myBets || {}).reduce((a, b) => a + (b || 0), 0),
    [state]
  );

  // 現在時間（本地）
  const [nowStr, setNowStr] = useState<string>("");
  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleString());
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass neon">
      <div className="content">
        <div className="row space-between">
          <h1 className="h1">{state?.room?.name || code}</h1>
          {/* 錢包徽章 */}
          <div className="wallet-badge">
            <span>錢包</span><span className="wallet-amt">{wallet.wallet.toLocaleString()}</span>
            <span className="wallet-sep">|</span>
            <span>銀行</span><span className="wallet-amt">{wallet.bank.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid">
          {/* 本局資訊 + 開牌 */}
          <div className="card col-6">
            <h3>本局資訊</h3>
            <div className="row" style={{justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
              <div>房間 <b>{state?.room?.code}</b></div>
              <div>局長 <b>{state?.room?.durationSeconds}</b>s</div>
              <div>局序 <b>{String(roundSeq).padStart(4,"0")}</b></div>
              <div>狀態 <b>{phase==="BETTING"?"下注中":phase==="REVEAL"?"揭曉":"結算"}</b></div>
              <div>倒數 <b>{countdown}s</b></div>
              <div>現在時間 <b>{nowStr}</b></div>
            </div>

            {/* 開牌舞台（BETTING 期顯示牌背、REVEAL 期逐張翻牌） */}
            {state?.result && (
              <div className="mt16">
                <div className="row" style={{gap: 24, alignItems:'center'}}>
                  <div>
                    <div className="subtle">開牌（閒）</div>
                    <div className="row" style={{gap:12, alignItems:'center'}}>
                      <PointBadge value={livePlayerTotal} />
                      {playerCards.map((c,i)=>(
                        <Playing
                          key={i}
                          r={c.rank}
                          s={c.suit}
                          flipIndex={i} // 閒從 0 開始
                          revealedCount={revealedCount}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="subtle">開牌（莊）</div>
                    <div className="row" style={{gap:12, alignItems:'center'}}>
                      <PointBadge value={liveBankerTotal} banker />
                      {bankerCards.map((c,i)=>(
                        <Playing
                          key={i}
                          r={c.rank}
                          s={c.suit}
                          flipIndex={playerCards.length + i} // 莊接在閒後面
                          revealedCount={revealedCount}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="subtle">結果</div>
                    <div className="h1" style={{fontSize:28}}>
                      {state.result.outcome === "PLAYER" ? "閒" :
                       state.result.outcome === "BANKER" ? "莊" : "和"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 我的下注 */}
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
            <div className="mt16 note">合計：<b>{totalBet.toLocaleString()}</b></div>
          </div>

          {/* 籌碼選擇 */}
          <div className="card col-12">
            <h3>選擇籌碼</h3>
            <div className="row">
              {CHIPS.map(c=>(
                <button key={c} className={`btn ${c===chip?'shimmer':''}`} onClick={()=>setChip(c)}>{c.toLocaleString()}</button>
              ))}
            </div>
          </div>

          {/* 下注區 */}
          <div className="card col-12">
            <h3>下注區</h3>
            <div className="row" style={{gap: 12, flexWrap:'wrap'}}>
              {(SIDES.map(s => s.key) as BetSide[]).map(side => (
                <button
                  key={side}
                  className={`btn ${placing===side?'shimmer':''}`}
                  disabled={phase!=="BETTING" || placing!==null}
                  onClick={()=>placeBet(side)}
                >
                  {SIDES.find(s => s.key===side)?.label} +{chip.toLocaleString()}
                </button>
              ))}
            </div>
            {err && <div className="note mt16" style={{color:'#f87171'}}>{err}</div>}
          </div>

          {/* 路子（近10局） */}
          <div className="card col-12">
            <h3>路子（近10局）</h3>
            <div className="road-grid">
              {(state?.recent || []).slice().reverse().map((r, idx) => {
                const cls =
                  r.outcome==="PLAYER" ? "road-P" :
                  r.outcome==="BANKER" ? "road-B" : "road-T";
                return (
                  <span key={idx} className={`road-dot ${cls}`} title={`#${r.roundSeq} (${r.p}:${r.b})`} />
                );
              })}
            </div>
          </div>

          {/* 導覽 */}
          <div className="card col-12">
            <div className="row">
              <Link href="/casino" className="btn-secondary btn">返回賭場</Link>
              <Link href="/lobby" className="btn-secondary btn">回大廳</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 單張撲克牌（只在已輪到該張時 flip；否則顯示牌背） */
function Playing({ r, s, flipIndex, revealedCount }:{
  r:number; s:number; flipIndex:number; revealedCount:number
}) {
  const flipped = revealedCount > flipIndex; // 已輪到這張 → 翻面
  return (
    <div className="card-stage">
      <div className={`playing-card ${flipped ? 'flip' : ''}`}>
        <div className="back">TOPZ</div>
        <div className="face">
          <div className={`card-rank ${isRedSuit(s)?'red':''}`}>{rankText(r)}</div>
          <div className={`card-suit ${isRedSuit(s)?'red':''}`}>{suitIcon(s)}</div>
        </div>
      </div>
    </div>
  );
}

/** 點數徽章（REVEAL 即時變動；SETTLED 為最終） */
function PointBadge({ value, banker }: { value: string|number; banker?: boolean }) {
  return (
    <div className={`point-badge ${banker ? 'banker' : 'player'}`} title="即時點數">
      {value}
    </div>
  );
}
