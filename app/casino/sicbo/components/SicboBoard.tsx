// app/casino/sicbo/components/SicboBoard.tsx
"use client";
import { useMemo, useState } from "react";
import "@/styles/sicbo.css";

type Bet = { key:string; title:string; odds:number|string; payload:any; zone?: "BIG"|"SMALL"|null };

export default function SicboBoard({
  payoutTable, disabled, onBet, winKeys,
}:{
  payoutTable:any;
  disabled:boolean;
  onBet:(b:{kind:string; amount:number; [k:string]:any})=>void;
  winKeys:Set<string>;
}){
  const [chip, setChip] = useState(100);
  const odds = payoutTable;

  const bigSmall: Bet[] = [
    { key:"BIG", title:"大", odds:odds.bigSmall.BIG, payload:{ kind:"BIG_SMALL", bigSmall:"BIG" }, zone:"BIG" },
    { key:"SMALL", title:"小", odds:odds.bigSmall.SMALL, payload:{ kind:"BIG_SMALL", bigSmall:"SMALL" }, zone:"SMALL" },
  ];

  const totals: Bet[] = useMemo(()=> {
    const arr: Bet[] = [];
    for (const k of Object.keys(odds.total).map(Number).sort((a,b)=>a-b)) {
      arr.push({ key:`TOTAL_${k}`, title:`${k}`, odds:odds.total[k], payload:{ kind:"TOTAL", totalSum:k }});
    }
    return arr;
  }, [odds]);

  const singles: Bet[] = Array.from({length:6},(_,i)=> i+1).map(n=>({ key:`FACE_${n}`, title:`點 ${n}`, odds:"1~3", payload:{kind:"SINGLE_FACE", face:n} }));
  const doubles: Bet[] = Array.from({length:6},(_,i)=> i+1).map(n=>({ key:`DBL_${n}`, title:`雙 ${n}`, odds:odds.doubleFace, payload:{kind:"DOUBLE_FACE", face:n} }));
  const triples: Bet[] = [
    { key:"TRIPLE_ANY", title:"任意圍", odds:odds.anyTriple, payload:{kind:"ANY_TRIPLE"} },
    ...Array.from({length:6},(_,i)=> i+1).map(n=>({ key:`TRIPLE_${n}${n}${n}`, title:`${n}${n}${n}`, odds:odds.specificTriple, payload:{kind:"SPECIFIC_TRIPLE", face:n} }))
  ];
  const combos: Bet[] = []; for (let a=1;a<=5;a++) for (let b=a+1;b<=6;b++) combos.push({ key:`COMBO_${a}_${b}`, title:`${a}-${b}`, odds:odds.twoDiceCombo, payload:{kind:"TWO_DICE_COMBO", faceA:a, faceB:b} });

  const cell = (b:Bet)=>(
    <button
      key={b.key}
      disabled={disabled}
      onClick={()=> onBet({ ...b.payload, amount: chip })}
      className={`cell-btn ${b.zone==="BIG"?"bigZone":b.zone==="SMALL"?"smallZone":""} ${winKeys.has(b.key)?"win-flash":""}`}
      title={`賠率 ${typeof b.odds==="number"?`x${b.odds}`:b.odds}`}
    >
      <div className="cell-title">{b.title}</div>
      <div className="cell-odds">{typeof b.odds==="number"?`x${b.odds}`:b.odds}</div>
    </button>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass p-3 space-y-3 rounded-lg">
        <div className="grid grid-cols-2 gap-3">{bigSmall.map(cell)}</div>
        <div className="grid grid-cols-7 gap-3">{totals.map(cell)}</div>
        <div className="text-sm opacity-80">單點（出 1/2/3 顆 → x1/x2/x3）</div>
        <div className="grid grid-cols-6 gap-3">{singles.map(cell)}</div>
      </div>
      <div className="glass p-3 space-y-3 rounded-lg">
        <div className="grid grid-cols-6 gap-3">{doubles.map(cell)}</div>
        <div className="grid grid-cols-7 gap-3">{triples.map(cell)}</div>
        <div className="board-grid">{combos.map(cell)}</div>
      </div>
      <div className="glass p-3 col-span-full flex items-center gap-3 rounded-lg">
        {[10,100,1000,5000,10000].map(v=>(
          <button key={v} onClick={()=>setChip(v)} className={`px-3 py-2 rounded ${chip===v?"bg-white/20":""}`}>{v}</button>
        ))}
        <div className="ml-auto text-sm opacity-80">點選格位即可下注（每次 {chip} ）</div>
      </div>
    </div>
  );
}
