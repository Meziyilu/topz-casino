"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StateResp = {
  current: { id:string; code:number; drawAt:string; status:"OPEN"|"LOCKED"|"DRAWN"|"SETTLED"; numbers:number[]; special:number|null; pool:number; jackpot:number };
  config: { drawIntervalSec:number; lockBeforeDrawSec:number; picksCount:number; pickMax:number; betTiers:number[]; bigThreshold:number };
  serverTime: string;
  locked: boolean;
};

function cx(...xs:(string|false|null|undefined)[]){ return xs.filter(Boolean).join(" "); }
const BALLS = [1,2,3,4,5,6];

export default function LottoPage() {
  const [s, setS] = useState<StateResp|null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [placing, setPlacing] = useState(false);
  const [toast, setToast] = useState<{type:"ok"|"warn"|"err"; text:string} | null>(null);
  const [mybets, setMybets] = useState<any[]>([]);
  const [prevStatus, setPrevStatus] = useState<Record<string,string>>({});

  const timeLeft = useCountdown(s?.current.drawAt, s?.serverTime);
  const locked = s?.locked || false;
  const picksCount = s?.config?.picksCount ?? 6;
  const pickMax = s?.config?.pickMax ?? 49;

  // 狀態輪詢（每秒）
  const pullState = useCallback(async ()=>{
    const r = await fetch("/api/lotto/state", { cache:"no-store" });
    const d = await r.json(); setS(d);
    if (d.current.status === "DRAWN") {
      window.dispatchEvent(new CustomEvent("lotto:drawn", { detail: d.current }));
    }
  }, []);
  useEffect(()=>{ pullState(); const i=setInterval(pullState, 1000); return ()=>clearInterval(i); }, [pullState]);

  // 初始金額檔位
  useEffect(()=>{ if (s?.config && amount===0) setAmount(s.config.betTiers[0]); }, [s]);

  // 我的注單輪詢（2s）
  const pullMyBets = useCallback(async ()=>{
    const r = await fetch("/api/lotto/my-bets", { cache:"no-store", credentials:"include" });
    const d = await r.json();
    if (Array.isArray(d.items)) {
      setMybets(d.items);
      const changes:string[] = [];
      d.items.forEach((b:any)=>{
        const old = prevStatus[b.id];
        if (old && old==="PENDING" && (b.status==="WON"||b.status==="LOST")) changes.push(b.status);
      });
      if (changes.length) setToast({ type: changes.includes("WON")?"ok":"warn", text: changes.includes("WON")?"🎉 派彩入帳！":"未中獎，下次加油～" });
      const ns:Record<string,string> = {}; d.items.forEach((b:any)=> ns[b.id]=b.status); setPrevStatus(ns);
    }
  }, [prevStatus]);
  useEffect(()=>{ pullMyBets(); const i=setInterval(pullMyBets, 2000); return ()=>clearInterval(i); }, [pullMyBets]);

  // UI 行為
  function togglePick(n:number){
    if (locked) return;
    setPicked(prev=>{
      const has = prev.includes(n);
      if (has) return prev.filter(x=>x!==n);
      if (prev.length >= picksCount) return prev;
      return [...prev, n].sort((a,b)=>a-b);
    });
  }
  async function place(body:any, okMsg:string){
    setPlacing(true);
    const r = await fetch("/api/lotto/bet", { method:"POST", credentials:"include", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ...body, amount })});
    const d = await r.json();
    if (!r.ok) {
      setToast({ type: d?.error==="LOCKED"?"warn":"err", text: d?.error==="LOCKED"?"封盤中，無法下注": d?.error==="INSUFFICIENT_FUNDS" ? "餘額不足" : "下注失敗" });
    } else {
      setToast({ type:"ok", text: okMsg });
      pullMyBets();
    }
    setPlacing(false);
    pullState();
    setTimeout(()=>setToast(null), 2200);
  }
  const betPicks = async ()=>{ if (picked.length !== picksCount) return setToast({type:"warn",text:`請選滿 ${picksCount} 顆`}); await place({ picks: picked }, "已下注（選號）"); setPicked([]); };
  const betSpecial = async (side:"ODD"|"EVEN")=> place({ specialSide: side }, `已下注（特別號${side==="ODD"?"單":"雙"}）`);
  const betBallAttr = async (i:number, a:"BIG"|"SMALL"|"ODD"|"EVEN")=> place({ ballIndex:i, attr:a }, `已下注（第${i}球 ${labelAttr(a)}）`);

  return (
    <div className="min-h-[calc(100vh-80px)] relative overflow-hidden">
      <BackgroundFlow />

      {toast && (
        <div className={cx("fixed top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl border backdrop-blur",
            toast.type==="ok" ? "bg-emerald-500/20 border-emerald-400/40 text-white" :
            toast.type==="warn" ? "bg-amber-500/20 border-amber-400/40 text-white" :
            "bg-rose-500/20 border-rose-400/40 text-white")}>
          {toast.text}
        </div>
      )}

      <div className="relative max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-white">
            <div className="text-2xl font-semibold">大樂透</div>
            <div className="text-white/70 text-sm">
              第 <b>{s?.current.code ?? "-"}</b> 期　|　{ s?.current.status==="DRAWN" ? "開獎中…" : (locked ? "封盤中" : `距離開獎 ${formatRemain(useCountdown(s?.current.drawAt, s?.serverTime))}`) }
            </div>
          </div>
          <div className="text-right text-white/80 text-sm">
            獎池：<b className="text-white">{fmt(s?.current.pool ?? 0)}</b>
            <span className="ml-2">（上期頭獎：{fmt(s?.current.jackpot ?? 0)}）</span>
          </div>
        </div>

        {/* 上：動畫 + 歷史 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <LottoBallMachine minDurationMs={20000} />
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4 text-white">
            <RecentHistory />
          </div>
        </div>

        {/* 下：下注面板 + 我的注單 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 選號 */}
          <div className="lg:col-span-2 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5">
            <div className="text-white font-semibold mb-3">選擇 {picksCount} 個號碼</div>
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
              {Array.from({length: pickMax}, (_,i)=>i+1).map(n=>(
                <button key={n} disabled={locked}
                  onClick={()=>togglePick(n)}
                  className={cx("h-10 rounded-xl border transition backdrop-blur",
                    picked.includes(n) ? "bg-emerald-500/30 border-emerald-400/50 text-white font-medium shadow"
                                       : "bg-white/10 border-white/15 text-white/80 hover:bg-white/15")}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <AmountSelector tiers={s?.config?.betTiers ?? [10,50,100,500,1000]} amount={amount} setAmount={setAmount}/>
              <button disabled={placing || locked || picked.length !== picksCount}
                onClick={betPicks}
                className="ml-auto px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white hover:border-white/40 disabled:opacity-50">
                下注（選號）
              </button>
            </div>
          </div>

          {/* 右側：特別號單雙 + 各球屬性 + 我的注單 */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5">
              <div className="text-white font-semibold mb-3">特別號 單/雙</div>
              <div className="flex gap-3">
                <button disabled={locked||placing} onClick={()=>betSpecial("ODD")}
                        className="flex-1 px-4 py-3 rounded-xl border bg-white/10 border-white/15 text-white hover:border-white/30">單 ODD</button>
                <button disabled={locked||placing} onClick={()=>betSpecial("EVEN")}
                        className="flex-1 px-4 py-3 rounded-xl border bg-white/10 border-white/15 text-white hover:border-white/30">雙 EVEN</button>
              </div>
              <div className="mt-4">
                <AmountSelector tiers={s?.config?.betTiers ?? [10,50,100,500,1000]} amount={amount} setAmount={setAmount}/>
              </div>
              <div className="text-amber-300 text-sm mt-3">封盤前 {s?.config?.lockBeforeDrawSec ?? 15} 秒不可下注</div>
            </div>

            {/* 各球屬性 */}
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5">
              <div className="text-white font-semibold mb-3">各球屬性（第1~6球）</div>
              <div className="space-y-2">
                {BALLS.map(i=>(
                  <div key={i} className="flex gap-2">
                    <div className="min-w-[64px] text-white/70 text-sm pt-2">第{i}球</div>
                    {(["BIG","SMALL","ODD","EVEN"] as const).map(attr=>(
                      <button key={attr} disabled={locked||placing} onClick={()=>betBallAttr(i, attr)}
                        className="flex-1 px-3 py-2 rounded-xl border bg-white/10 border-white/15 text-white hover:border-white/30">
                        {labelAttr(attr)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <AmountSelector tiers={s?.config?.betTiers ?? [10,50,100,500,1000]} amount={amount} setAmount={setAmount}/>
              </div>
            </div>

            {/* 我的注單 */}
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-5 text-white">
              <div className="font-semibold mb-3">我的注單</div>
              <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                {mybets.map((b:any)=>(
                  <div key={b.id} className="flex items-center justify-between gap-2">
                    <div className="text-white/80 text-xs">
                      #{b.round.code} {labelBet(b)} <span className="ml-1 text-white/60">×{b.amount.toLocaleString()}</span>
                    </div>
                    <div className={cx("text-xs px-2 py-0.5 rounded-lg border",
                          b.status==="PENDING"?"text-white/70 border-white/20":
                          b.status==="WON"?"text-emerald-300 border-emerald-400/40":
                          "text-white/60 border-white/20")}>
                      {b.status}{b.payout>0?` +${b.payout.toLocaleString()}`:""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 小工具（UI/動畫/倒數/歷史） ----
function labelAttr(a:"BIG"|"SMALL"|"ODD"|"EVEN"){ return a==="BIG"?"大 BIG":a==="SMALL"?"小 SMALL":a==="ODD"?"單 ODD":"雙 EVEN"; }
function labelBet(b:any){
  if (b.kind==="PICKS") return `選號(${b.picksKey})`;
  if (b.kind==="SPECIAL_ODD") return "特別號-單";
  if (b.kind==="SPECIAL_EVEN") return "特別號-雙";
  if (b.kind==="BALL_ATTR") return `第${b.ballIndex}球-${labelAttr(b.attr)}`;
  return b.kind;
}

function BackgroundFlow(){
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-1/3 -left-1/3 w-[800px] h-[800px] rounded-full blur-3xl opacity-30 animate-[float_18s_ease-in-out_infinite] bg-gradient-to-tr from-indigo-500 via-cyan-400 to-emerald-400" />
      <div className="absolute -bottom-1/3 -right-1/3 w-[900px] h-[900px] rounded-full blur-3xl opacity-30 animate-[float_22s_ease-in-out_infinite] bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-pink-400" />
      <style jsx global>{`@keyframes float{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-20px) translateX(10px)}}`}</style>
    </div>
  );
}

function useCountdown(drawAt?: string, serverTime?: string){
  const [remain, setRemain] = useState<number>(0);
  useEffect(()=>{
    if (!drawAt) return;
    const now = serverTime ? new Date(serverTime).getTime() : Date.now();
    const end = new Date(drawAt).getTime();
    setRemain(Math.max(0, Math.floor((end - now)/1000)));
    const id = setInterval(()=> setRemain(v=>Math.max(0, v-1)), 1000);
    return ()=>clearInterval(id);
  }, [drawAt, serverTime]);
  return remain;
}
function formatRemain(s?: number){ if (s==null) return "--:--"; const m=Math.floor(s/60), ss=s%60; return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`; }
function fmt(n?: number){ return (n ?? 0).toLocaleString(); }

function AmountSelector({ tiers, amount, setAmount }:{ tiers:number[]; amount:number; setAmount:(n:number)=>void }){
  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map(t=>(
        <button key={t} onClick={()=>setAmount(t)}
          className={cx("px-3 py-2 rounded-xl border text-white",
            amount===t ? "bg-white/20 border-white/40" : "bg-white/10 border-white/15 hover:border-white/30")}>
          {t.toLocaleString()} 元
        </button>
      ))}
    </div>
  );
}

function RecentHistory(){
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(async ()=>{ const r=await fetch("/api/lotto/history?limit=10",{cache:"no-store"}); const d=await r.json(); setItems(d.items||[]); },[]);
  useEffect(()=>{ load(); const i=setInterval(load, 5000); return ()=>clearInterval(i); },[load]);
  return (
    <div className="text-white text-sm">
      <div className="font-medium mb-2">近十期</div>
      <div className="space-y-2">
        {items.map(it=>(
          <div key={it.code} className="flex items-center gap-3">
            <div className="min-w-[64px] text-white/80">#{it.code}</div>
            <div className="flex flex-wrap gap-1">
              {(it.numbers||[]).map((n:number)=>(
                <span key={n} className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15">{n}</span>
              ))}
              {it.special && (<span className="px-2 py-0.5 rounded-lg bg-amber-500/30 border border-amber-300/40 ml-1">★ {it.special}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 轉珠機（≥20s）
function LottoBallMachine({ minDurationMs=20000 }:{ minDurationMs?:number }){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const animRef = useRef<number| null>(null);
  const phaseRef = useRef<"idle"|"spinning"|"revealing">("idle");
  const queueRef = useRef<number[]>([]);
  const specialRef = useRef<number|null>(null);
  const revealedRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);

  useEffect(()=>{
    function onDrawn(e:any){
      const { numbers, special } = e.detail;
      queueRef.current = [...(numbers||[])];
      specialRef.current = special ?? null;
      start();
    }
    window.addEventListener("lotto:drawn", onDrawn as any);
    return ()=>window.removeEventListener("lotto:drawn", onDrawn as any);
  }, []);

  function start(){
    const can = canvasRef.current!; const ctx = can.getContext("2d")!;
    phaseRef.current = "spinning"; revealedRef.current = 0; startedAtRef.current = performance.now();

    let balls = Array.from({length: 42}).map(()=>({
      x: 40 + Math.random()*(can.width-80),
      y: 40 + Math.random()*(can.height-80),
      vx: (Math.random()*2-1)*2.2, vy: (Math.random()*2-1)*2.1,
      r: 18, val: Math.floor(Math.random()*49)+1
    }));

    function drawFrame(t:number){
      ctx.clearRect(0,0,can.width,can.height);
      // 背景玻璃
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0,0,can.width,can.height);
      drawRack(ctx, can);

      if (phaseRef.current === "spinning") {
        const spinTime = 8000; // 8s
        const elapsed = t - startedAtRef.current;
        const speedMul = (elapsed < spinTime/3) ? (1 + elapsed/(spinTime/3)) :
                         (elapsed > spinTime*0.66) ? (3 - (elapsed - spinTime*0.66)/(spinTime*0.34)*2) : 3;
        balls.forEach(b=>{
          b.x += b.vx*speedMul; b.y += b.vy*speedMul;
          if (b.x < b.r || b.x > can.width-b.r) b.vx *= -1;
          if (b.y < b.r || b.y > can.height-b.r) b.vy *= -1;
          drawBall(ctx, b.x, b.y, b.r, b.val, "rgba(255,255,255,0.85)");
        });
        if (elapsed >= spinTime) { phaseRef.current = "revealing"; revealNext(); }
        else { animRef.current = requestAnimationFrame(drawFrame); }
      }
    }
    animRef.current = requestAnimationFrame(drawFrame);

    function revealNext(){
      const isSpecial = (queueRef.current.length===0 && specialRef.current!=null);
      const val = isSpecial ? (specialRef.current as number) : queueRef.current.shift()!;
      if (isSpecial) specialRef.current = null;

      const offset = revealedRef.current; revealedRef.current++;
      const slot = slotPos(can, offset);

      const start = performance.now(); const dur = 1400;
      function step(now:number){
        const p = Math.min(1, (now-start)/dur);
        ctx.clearRect(0,0,can.width,can.height);
        ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0,0,can.width,can.height);
        drawRack(ctx, can);
        balls.forEach(b=> drawBall(ctx,b.x,b.y,b.r,b.val,"rgba(255,255,255,0.25)"));
        const x = 80 + p*(slot.x-80), y = 180 + (Math.sin(p*Math.PI)*-60);
        drawBall(ctx, x, y, 18, val, isSpecial ? "rgba(251,191,36,0.92)" : "rgba(255,255,255,0.92)");
        if (p<1) requestAnimationFrame(step);
        else {
          if (queueRef.current.length || specialRef.current!=null) setTimeout(revealNext, 350);
          else {
            const total = performance.now() - startedAtRef.current;
            const remain = Math.max(0, minDurationMs - total);
            setTimeout(()=> cancel(), remain);
          }
        }
      }
      requestAnimationFrame(step);
    }

    function cancel(){ if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null; }
    function drawRack(ctx:CanvasRenderingContext2D, can:HTMLCanvasElement){
      const slots=7;
      for(let i=0;i<slots;i++){
        const pos=slotPos(can,i);
        ctx.beginPath(); ctx.roundRect(pos.x-20,pos.y-20,40,40,10 as any);
        ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fill(); ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.stroke();
      }
    }
    function drawBall(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,val:number,color:string){
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
      ctx.fillStyle="#111827"; ctx.font="bold 14px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(String(val), x, y);
    }
    function slotPos(can:HTMLCanvasElement, i:number){
      const cols=3; const w=44; const startX=can.width- (cols*w) - 24; const startY=40;
      if (i<=5){ const row=Math.floor(i/3), col=i%3; return { x: startX + col*w + 20, y: startY + row*w + 20 }; }
      return { x: startX + (w*1) + 20, y: startY + (w*2) + 20 + 44 }; // 特別號置中
    }
  }

  useEffect(()=>{
    const can = canvasRef.current!;
    const onResize = ()=>{
      const rect = can.parentElement!.getBoundingClientRect();
      can.width = Math.max(380, rect.width - 16);
      can.height = Math.max(260, 320);
    };
    onResize(); window.addEventListener("resize", onResize); return ()=>window.removeEventListener("resize", onResize);
  }, []);

  return <canvas ref={canvasRef} className="w-full rounded-xl border border-white/15 bg-white/5 backdrop-blur" />;
}
