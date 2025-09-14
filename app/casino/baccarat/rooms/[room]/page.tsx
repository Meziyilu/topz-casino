"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "@/public/styles/baccarat.css";

type Room = "R30"|"R60"|"R90";
type Phase = "BETTING"|"REVEALING"|"SETTLED";
type BetSide =
  | "PLAYER"|"BANKER"|"TIE"
  | "PLAYER_PAIR"|"BANKER_PAIR"
  | "ANY_PAIR"|"PERFECT_PAIR"
  | "BANKER_SUPER_SIX";

const SIDES: {key:BetSide; label:string; sub?:string}[] = [
  { key:"ANY_PAIR", label:"任意對子", sub:"1:5" },
  { key:"PLAYER_PAIR", label:"閒對", sub:"1:11" },
  { key:"BANKER_PAIR", label:"莊對", sub:"1:11" },
  { key:"PERFECT_PAIR", label:"完美對子", sub:"1:25" },
  { key:"PLAYER", label:"閒", sub:"1:1" },
  { key:"TIE", label:"和", sub:"1:8" },
  { key:"BANKER", label:"莊", sub:"1:0.95" },
  { key:"BANKER_SUPER_SIX", label:"超級六", sub:"1:12" },
];

const CHIPS = [10,50,100,500,1000];

async function jget<T=any>(url:string){ const r = await fetch(url,{ cache:"no-store" }); return r.json() as Promise<T>; }
async function jpost<T=any>(url:string, body:any){
  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-user-id":"demo-user" }, // 無 JWT，帶入帳號
    body: JSON.stringify(body)
  });
  return r.json() as Promise<T>;
}

function faceLabel(v:number){
  // 後端 1..9, 10(=0)；這裡將 10 顯示為 10（不區分 JQK）
  if (v===1) return "A";
  if (v>=2 && v<=9) return String(v);
  return "10";
}

function FlipCard({ value, delayMs=0, color }:{ value:number; delayMs?:number; color:"blue"|"red" }){
  // 3D 翻牌：背面→正面；用 delay 決定順序
  return (
    <div className={`flip-card ${color}`} style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flip-inner">
        {/* 背面（牌背） */}
        <div className="flip-front">
          <div className="back-pattern">百家樂</div>
        </div>
        {/* 正面（牌面） */}
        <div className="flip-back">
          <div className="pips">{faceLabel(value)}</div>
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }:{ params:{ room:Room }}){
  const room = (params.room?.toUpperCase() as Room) || "R30";
  const [s, setS] = useState<any>(null);
  const [chip, setChip] = useState(CHIPS[0]);
  const [bets, setBets] = useState<Record<BetSide,number>>({} as any);
  const [placing, setPlacing] = useState(false);
  const [clock, setClock] = useState<string>("");

  useEffect(()=>{
    const tick = ()=> setClock(new Date().toLocaleTimeString());
    tick();
    const t1 = setInterval(tick, 1000);
    let t2:any;
    const pull = async ()=>{
      const data = await jget(`/api/casino/baccarat/state?room=${room}`);
      setS(data);
    };
    pull();
    t2 = setInterval(pull, 1000);
    return ()=>{ clearInterval(t1); clearInterval(t2); };
  },[room]);

  const totalBet = useMemo(()=>Object.values(bets).reduce((a,b)=>a+(b||0),0),[bets]);
  const addBet = (k:BetSide)=> setBets(prev=>({ ...prev, [k]: (prev[k]||0)+chip }));
  const clearBets = ()=> setBets({} as any);

  const confirm = async ()=>{
    if (!s?.round?.id) return;
    setPlacing(true);
    try{
      const entries = Object.entries(bets) as [BetSide,number][];
      for (const [side, amount] of entries){
        if (amount>0){
          await jpost("/api/casino/baccarat/bet", { room, roundId:s.round.id, side, amount });
        }
      }
      clearBets();
    } finally { setPlacing(false); }
  };

  const bead = (s?.bead ?? []) as ("BANKER"|"PLAYER"|"TIE")[];

  // --- 翻牌序列（總長 8 秒；依序延遲） ---
  // 0.5s 閒1、1.5s 莊1、2.5s 閒2、3.5s 莊2、5.0s 閒補、6.0s 莊補
  const seqDelay = { p1:500, b1:1500, p2:2500, b2:3500, pt:5000, bt:6000 };

  const p = s?.table?.player ?? [];
  const b = s?.table?.banker ?? [];
  const pt = s?.table?.playerThird;
  const bt = s?.table?.bankerThird;

  return (
    <div className="bk-wrap">
      <header className="bk-topbar">
        <Link href="/casino/baccarat" className="bk-back">← 大廳</Link>
        <div className="bk-room">房間 {room}</div>
        <div className="bk-info">
          <span>局序 #{s?.round?.seq ?? "-"}</span>
          <span>狀態 {s?.round?.phase ?? "-"}</span>
          <span>倒數 {s?.timers?.endInSec ?? 0}s</span>
          <span>現在 {clock}</span>
        </div>
      </header>

      <main className="bk-main">
        {/* 下注盤 */}
        <section className="bk-board">
          <div className="bk-grid">
            {SIDES.map((it, i)=>(
              <button key={i}
                className={`bk-cell side-${it.key.toLowerCase().replace(/_/g,'-')}`}
                disabled={s?.locked}
                onClick={()=>addBet(it.key)}
              >
                <div className="bk-title">{it.label}</div>
                <div className="bk-sub">{it.sub}</div>
                <div className="bk-mybet">{(bets[it.key]||0)>0?`$${bets[it.key]}`:""}</div>
              </button>
            ))}
          </div>

          <div className="bk-ctrl">
            <div className="bk-chips">
              {CHIPS.map(c=>(
                <button key={c} className={`chip ${chip===c?'on':''}`} onClick={()=>setChip(c)}>{c}</button>
              ))}
              <button className="chip" onClick={()=>setChip(prev=>prev*2)}>×2</button>
            </div>
            <div className="bk-actions">
              <button className="ok" disabled={placing || s?.locked || totalBet<=0} onClick={confirm}>確定</button>
              <button className="cancel" onClick={clearBets}>取消</button>
              <div className="bk-total">合計：${totalBet}</div>
            </div>
          </div>

          {/* 8 秒翻牌動畫（REVEALING 期間顯示） */}
          {s?.round?.phase==="REVEALING" && (
            <div className="reveal-card">
              <div className="reveal-title">開獎中…</div>
              <div className="cards-rows">
                <div className="row">
                  <div className="seat-tag blue">閒</div>
                  <div className="cards">
                    {p.length>=1 && <FlipCard value={p[0]} delayMs={seqDelay.p1} color="blue" />}
                    {p.length>=2 && <FlipCard value={p[1]} delayMs={seqDelay.p2} color="blue" />}
                    {typeof pt==="number" && <FlipCard value={pt} delayMs={seqDelay.pt} color="blue" />}
                  </div>
                </div>
                <div className="row">
                  <div className="seat-tag red">莊</div>
                  <div className="cards">
                    {b.length>=1 && <FlipCard value={b[0]} delayMs={seqDelay.b1} color="red" />}
                    {b.length>=2 && <FlipCard value={b[1]} delayMs={seqDelay.b2} color="red" />}
                    {typeof bt==="number" && <FlipCard value={bt} delayMs={seqDelay.bt} color="red" />}
                  </div>
                </div>
              </div>

              <div className="result">
                {s.table?.outcome==="PLAYER" && <span className="win blue glow-flash">閒勝</span>}
                {s.table?.outcome==="BANKER" && <span className="win red glow-flash">莊勝</span>}
                {s.table?.outcome==="TIE"    && <span className="win yellow glow-flash">和局</span>}
              </div>
            </div>
          )}
        </section>

        {/* 路子（🔴莊 🔵閒 🟡和） */}
        <section className="bk-road">
          <div className="road-grid">
            {bead.map((x,i)=>(
              <div key={i} className={`dot ${x==='BANKER'?'red':x==='PLAYER'?'blue':'yellow'}`}/>
            ))}
          </div>
        </section>

        {/* 我的注單（近 10 筆） */}
        <section className="bk-mybets">
          <MyBets room={room}/>
        </section>
      </main>
    </div>
  );
}

function MyBets({ room }:{ room:Room }){
  const [list, setList] = useState<any[]>([]);
  useEffect(()=>{
    let t:any;
    const pull = async ()=> setList((await jget(`/api/casino/baccarat/my-bets?room=${room}`)).items||[]);
    pull(); t=setInterval(pull, 2000); return ()=>clearInterval(t);
  },[room]);
  return (
    <div className="mybets">
      <div className="title">我的注單（近 10 筆）</div>
      <ul>{list.slice(0,10).map((b,i)=>(
        <li key={i}>
          <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
          <span>{b.side}</span>
          <span>${b.amount}</span>
        </li>
      ))}</ul>
    </div>
  );
}
