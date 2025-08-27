'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/** ===== 型別 ===== */
type Phase = "BETTING" | "REVEAL" | "SETTLED";
type BetSide = "PLAYER" | "BANKER" | "TIE" | "PLAYER_PAIR" | "BANKER_PAIR" | "ANY_PAIR" | "PERFECT_PAIR";
type RoomCode = "R30" | "R60" | "R90";
type RoomInfo = { code: RoomCode; name: string; durationSeconds: number };

type StatePayload = {
  room: RoomInfo;
  day: string;                 // UTC 時間（台北日切）
  roundSeq: number;            // 當日局序
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

/** ===== 主頁面 ===== */
export default function BaccaratRoomPage() {
  const params = useParams<{ room: RoomCode }>();
  const code: RoomCode = (params?.room?.toUpperCase() as RoomCode) || "R60";

  const [state, setState] = useState<StatePayload | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<BetSide | null>(null);
  const [err, setErr] = useState<string>("");
  const [wallet, setWallet] = useState<{wallet: number; bank: number}>({wallet:0, bank:0});

  // 翻牌動畫：依序翻牌
  const [revealedCount, setRevealedCount] = useState(0);

  // 取得狀態
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${code}`, { cache: "no-store" });
      const data = await res.json();
      setState(data);
    } catch {}
  };
  // 取得錢包
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

  // 當進入 REVEAL，就依序翻牌
  useEffect(() => {
    if (state?.phase === "REVEAL" && state.result) {
      setRevealedCount(0);
      const totalCards = (state.result.playerCards?.length || 0) + (state.result.bankerCards?.length || 0);
      for (let i = 0; i < totalCards; i++) {
        setTimeout(() => setRevealedCount(prev => prev + 1), i * 900); // 每 0.9s 翻一張
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
  const reveal = Boolean(state?.result && phase !== "BETTING");

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
          {/* 本局資訊 + 開牌動畫 */}
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

            {/* 開牌區 */}
            {state?.result && (
              <div className="mt16">
                <div className="row" style={{gap: 24, alignItems:'center'}}>
                  <div>
                    <div className="subtle">開牌（閒）</div>
                    <div className="row" style={{gap:12}}>
                      {playerCards.map((c,i)=>(
                        <Playing
                          key={i}
                          r={c.rank} s={c.suit}
                          flipped={i < revealedCount}
                          delayMs={i*150}
                        />
                      ))}
                    </div>
                    <div className="mt16"><b>點數：{state.result.playerTotal}</b></div>
                  </div>
                  <div>
                    <div className="subtle">開牌（莊）</div>
                    <div className="row" style={{gap:12}}>
                      {bankerCards.map((c,i)=>(
                        <Playing
                          key={i}
                          r={c.rank} s={c.suit}
                          flipped={(i + playerCards.length) < revealedCount}
                          delayMs={i*150 + 300}
                        />
                      ))}
                    </div>
                    <div className="mt16"><b>點數：{state.result.bankerTotal}</b></div>
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

          {/* 下注區（已修正：BetSide 型別） */}
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

          {/* 路子（近10局珠盤路簡版） */}
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
            <div className="note mt16">提示：後續可擴充大路/大眼仔/小路/曱甴路。</div>
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

/** 單張撲克牌（翻牌動畫） */
function Playing({ r, s, flipped, delayMs }: { r:number; s:number; flipped:boolean; delayMs?:number }) {
  return (
    <div className="card-stage glow-in" style={{ animationDelay: `${delayMs||0}ms` }}>
      <div className={`playing-card ${flipped ? 'flip' : ''}`} style={{ transitionDelay: `${delayMs||0}ms` }}>
        <div className="back">
          <div style={{fontWeight:800, opacity:.75}}>TOPZ</div>
        </div>
        <div className="face">
          <div className={`card-rank ${isRedSuit(s)?'red':''}`}>{rankText(r)}</div>
          <div className={`card-suit ${isRedSuit(s)?'red':''}`}>{suitIcon(s)}</div>
        </div>
      </div>
    </div>
  );
}
