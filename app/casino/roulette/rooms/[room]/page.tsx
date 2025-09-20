"use client";

import { useEffect, useMemo, useState } from "react";
import "@/public/styles/roulette.css";

type Room = "RL_R30" | "RL_R60" | "RL_R90";
type Phase = "BETTING" | "REVEALING" | "SETTLED";

type Bet = { id: string; kind: string; amount: number };
type RoundRow = { id: string; result: number | null; startedAt: string; endedAt: string | null };
type StateResp = {
  room: Room;
  round: { id: string; phase: Phase; startedAt: string; result: number | null };
  timers: { lockInSec: number; endInSec: number; revealWindowSec: number };
  locked: boolean;
  myBets: Bet[];
};

const EVEN_MONEY = ["RED","BLACK","ODD","EVEN","LOW","HIGH"];
const DOZCOL = ["DOZEN_1","DOZEN_2","DOZEN_3","COLUMN_1","COLUMN_2","COLUMN_3"];
const NUMBERS = Array.from({length: 37}, (_,i)=>`NUMBER_${i}`);

export default function Page({ params }: { params: { room: Room } }) {
  const room = (params.room ?? "RL_R30") as Room;
  const [state, setState] = useState<StateResp | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [kind, setKind] = useState<string>("RED");
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [history, setHistory] = useState<RoundRow[]>([]);

  async function pullState() {
    const r = await fetch(`/api/casino/roulette/state?room=${room}`, { cache: "no-store" });
    const j = await r.json();
    setState(j);
  }
  async function pullHistory() {
    const r = await fetch(`/api/casino/roulette/history?room=${room}&limit=60`, { cache: "no-store" });
    const j = await r.json();
    setHistory(j);
  }

  useEffect(() => {
    let mounted = true;
    const boot = async () => { await pullState(); await pullHistory(); };
    boot();
    const t = setInterval(() => {
      setTick((x) => x + 1);
      pullState();
      if ((tick % 5) === 0) pullHistory();
    }, 1000);
    return () => { mounted = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const isRevealing = state?.round.phase === "REVEALING";
  const locked = state?.locked ?? true;

  async function onBet() {
    if (!kind || amount <= 0) return;
    setLoading(true);
    try {
      const r = await fetch("/api/casino/roulette/bet", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ room, kind, amount }),
      });
      const j = await r.json();
      if (!r.ok) alert(j.error || "下注失敗");
      else await pullState();
    } finally {
      setLoading(false);
    }
  }

  const road = useMemo(() => {
    const rows = history.slice().reverse();
    const toColor = (n: number | null) => n === null ? "-" : n === 0 ? "G" : ([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? "R" : "B");
    const toOddEven = (n: number | null) => n===null ? "-" : n===0 ? "0" : (n%2===1?"O":"E");
    const toLowHigh = (n: number | null) => n===null ? "-" : n===0 ? "0" : (n<=18?"L":"H");
    const toDozen = (n: number | null) => {
      if (n===null) return "-"; if (n===0) return "0";
      if (n<=12) return "D1"; if (n<=24) return "D2"; return "D3";
    };
    const toColumn = (n: number | null) => {
      if (n===null) return "-"; if (n===0) return "0";
      if ([1,4,7,10,13,16,19,22,25,28,31,34].includes(n)) return "C1";
      if ([2,5,8,11,14,17,20,23,26,29,32,35].includes(n)) return "C2";
      return "C3";
    };
    return {
      color: rows.map(r => ({ n:r.result, tag: toColor(r.result) })),
      oe:    rows.map(r => ({ n:r.result, tag: toOddEven(r.result) })),
      lh:    rows.map(r => ({ n:r.result, tag: toLowHigh(r.result) })),
      doz:   rows.map(r => ({ n:r.result, tag: toDozen(r.result) })),
      col:   rows.map(r => ({ n:r.result, tag: toColumn(r.result) })),
    };
  }, [history]);

  return (
    <div className={`rl-wrap ${isRevealing ? "revealing" : ""} ${locked ? "locked" : ""}`}>
      <header className="rl-head">
        <h1>Roulette — {room}</h1>
        <div className="rl-status">
          <span>Round: {state?.round.id.slice(0,8)}</span>
          <span>Phase: {state?.round.phase}</span>
          <span>Bet close in: {state?.timers.lockInSec ?? 0}s</span>
          <span>Settle in: {state?.timers.endInSec ?? 0}s</span>
          <span>Result: {state?.round.result ?? "-"}</span>
        </div>
      </header>

      <section className="rl-board">
        <div className="rl-wheel">
          <div className="rl-pin" />
          <div className="rl-spinring" />
          <div className="rl-flash" />
          <div className="rl-result">{state?.round.result ?? " "}</div>
        </div>
      </section>

      <section className="rl-panel">
        <div className="rl-amount">
          <label>Amount</label>
          <input type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||"0",10))}/>
          <div className="rl-chips">
            {[10,50,100,500,1000].map(v => (
              <button key={v} onClick={()=>setAmount(v)}>{v}</button>
            ))}
          </div>
        </div>

        <div className="rl-kinds">
          <div className="rl-group">
            <h4>Even-money</h4>
            {EVEN_MONEY.map(k => (
              <button key={k} className={k===kind ? "active" : ""} onClick={()=>setKind(k)} disabled={locked}>{k}</button>
            ))}
          </div>
          <div className="rl-group">
            <h4>Dozen / Column</h4>
            {DOZCOL.map(k => (
              <button key={k} className={k===kind ? "active" : ""} onClick={()=>setKind(k)} disabled={locked}>{k.replace("_"," ")}</button>
            ))}
          </div>
          <div className="rl-group">
            <h4>Numbers</h4>
            <div className="rl-numbers">
              {NUMBERS.map(k => (
                <button key={k} className={k===kind ? "active" : ""} onClick={()=>setKind(k)} disabled={locked}>{k.replace("NUMBER_","#")}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="rl-actions">
          <button className="primary" disabled={loading || locked} onClick={onBet}>下注</button>
        </div>
      </section>

      <section className="rl-mybets">
        <h3>本局我的下注</h3>
        <ul>
          {state?.myBets?.map(b => (<li key={b.id}><b>{b.kind}</b> — {b.amount}</li>)) || <li>—</li>}
        </ul>
      </section>

      <section className="rl-roads">
        <h3>路子圖</h3>

        <div className="road">
          <div className="road-title">Color</div>
          <div className="road-track">
            {road.color.map((x,i)=>(
              <span key={i} className={`chip ${x.tag==="R"?"red":x.tag==="B"?"black":x.tag==="G"?"green":"muted"}`}>{x.n ?? "-"}</span>
            ))}
          </div>
        </div>

        <div className="road">
          <div className="road-title">Odd/Even</div>
          <div className="road-track">
            {road.oe.map((x,i)=>(
              <span key={i} className={`chip ${x.tag==="O"?"odd":x.tag==="E"?"even":x.tag==="0"?"green":"muted"}`}>{x.tag}</span>
            ))}
          </div>
        </div>

        <div className="road">
          <div className="road-title">Low/High</div>
          <div className="road-track">
            {road.lh.map((x,i)=>(
              <span key={i} className={`chip ${x.tag==="L"?"low":x.tag==="H"?"high":x.tag==="0"?"green":"muted"}`}>{x.tag}</span>
            ))}
          </div>
        </div>

        <div className="road">
          <div className="road-title">Dozen</div>
          <div className="road-track">
            {road.doz.map((x,i)=>(
              <span key={i} className={`chip ${x.tag==="D1"?"d1":x.tag==="D2"?"d2":x.tag==="D3"?"d3":x.tag==="0"?"green":"muted"}`}>{x.tag}</span>
            ))}
          </div>
        </div>

        <div className="road">
          <div className="road-title">Column</div>
          <div className="road-track">
            {road.col.map((x,i)=>(
              <span key={i} className={`chip ${x.tag==="C1"?"c1":x.tag==="C2"?"c2":x.tag==="C3"?"c3":x.tag==="0"?"green":"muted"}`}>{x.tag}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
