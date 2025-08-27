'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Phase = "BETTING" | "REVEAL" | "SETTLED";
type RoomInfo = { code: "R30"|"R60"|"R90"; name: string; durationSeconds: number };
type StatePayload = {
  room: RoomInfo;
  day: string;
  roundSeq: number;
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

function suitIcon(s: number) { return ["♠","♥","♦","♣"][s] || "?"; }
function isRedSuit(s: number) { return s===1 || s===2; }
function rankText(r: number) { return ["","A","2","3","4","5","6","7","8","9","10","J","Q","K"][r] || "?"; }

export default function BaccaratRoomPage() {
  const params = useParams<{ room: "R30"|"R60"|"R90" }>();
  const code = (params?.room || "R60").toUpperCase();

  const [state, setState] = useState<StatePayload | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");
  const [wallet, setWallet] = useState<{wallet: number; bank: number}>({wallet:0, bank:0});

  // ===== 每秒取 state + 錢包 =====
  const fetchState = async () => {
    try {
      const res = await fetch(`/api/casino/baccarat/state?room=${code}`, { cache: "no-store" });
      const data = await res.json();
      setState(data);
    } catch {}
  };
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

  // ===== 下單 =====
  const placeBet = async (side: string) => {
    if (!state) return;
    if (state.phase !== "BETTING") { setErr("現在不是下注時間"); return; }
    setErr(""); setPlacing(side);
    try {
      const res = await fetch(`/api/casino/baccarat/bet?room=${code}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: chip })
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error || "下注失敗");
      else { fetchState(); fetchWallet(); }
    } catch { setErr("連線失敗"); }
    finally { setPlacing(null); }
  };

  // ===== 倒數 / 基本資料 =====
  const countdown = state?.secLeft ?? 0;
  const phase = state?.phase ?? "BETTING";
  const roundSeq = state?.roundSeq ?? 0;
  const totalBet = useMemo(() =>
    Object.values(state?.myBets || {}).reduce((a, b) => a + (b || 0), 0)
  , [state]);

  // ===== 現在時間（本地） =====
  const [nowStr, setNowStr] = useState<string>("");
  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleString());
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ===== 開牌動畫：在 REVEAL 期讓卡片 flip（使用 CSS 延遲） =====
  const reveal = state?.result && phase !== "BETTING";
  const playerCards = state?.result?.playerCards || [];
  const bankerCards = state?.result?.bankerCards || [];

  const Playing = ({r,s,delay=0}:{r:number;s:number;delay?:number}) => (
    <div className="card-stage glow-in" style={{ animationDelay: `${delay}ms` }}>
      <div className={`playing-card ${reveal ? 'flip' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="back">
          {/* 卡背圖案 */}
          <div style={{fontWeight:800, opacity:.75}}>TOPZ</div>
        </div>
        <div className="face">
          <div className={`card-rank ${isRedSuit(s)?'red':''}`}>{rankText(r)}</div>
          <div className={`card-suit ${isRedSuit(s)?'red':''}`}>{["♠","♥","♦","♣"][s]}</div>
        </div>
      </div>
    </div>
  );

  // 粒子小花（結果揭曉時爆光點）
  const sparks = Array.from({length: 10}).map((_,i)=>(
    <div key={i} className="spark" style={{ left: 40, top: 12, ['--dx' as any]: `${(Math.random()*80-40)|0}px`, ['--dy' as any]: `${(Math.random()*-60)|0}px` }} />
  ));

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
          {/* 資訊卡 */}
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

            {/* 開牌舞台 */}
            {state?.result && (
              <div className="mt16" style={{ position:'relative' }}>
                <div className="row" style={{gap: 24, alignItems:'center'}}>
                  <div>
                    <div className="subtle">開牌（閒）</div>
                    <div className="row" style={{gap:12}}>
                      {playerCards.map((c,i)=>(
                        <Playing key={i} r={c.rank} s={c.suit} delay={200*i} />
                      ))}
                    </div>
                    <div className="mt16"><b>點數：{state.result.playerTotal}</b></div>
                  </div>
                  <div>
                    <div className="subtle">開牌（莊）</div>
                    <div className="row" style={{gap:12}}>
                      {bankerCards.map((c,i)=>(
                        <Playing key={i} r={c.rank} s={c.suit} delay={200*i+300} />
                      ))}
                    </div>
                    <div className="mt16"><b>點數：{state.result.bankerTotal}</b></div>
                  </div>
                  <div>
                    <div className="subtle">結果</div>
                    <div style={{position:'relative'}}>
                      <div className="h1" style={{fontSize:28}}>
                        {state.result.outcome === "PLAYER" ? "閒" :
                         state.result.outcome === "BANKER" ? "莊" : "和"}
                      </div>
                      {reveal && <div style={{position:'absolute', left:-8, top:-8}}>{sparks}</div>}
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

          {/* 路子（珠盤路簡版：近10局） */}
          <div className="card col-12">
            <h3>路子（近10局）</h3>
            <div className="road-grid">
              {(state?.recent || []).slice().reverse().map((r, idx) => {
                const cls = r.outcome==="PLAYER" ? "road-P" : r.outcome==="BANKER" ? "road-B" : "road-T";
                return <span key={idx} className={`road-dot ${cls}`} title={`#${r.roundSeq} (${r.p}:${r.b})`}></span>;
              })}
            </div>
            <div className="note mt16">提示：之後可擴充大路/大眼仔路/小路/曱甴路。</div>
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
