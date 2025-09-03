'use client';
import { useEffect, useState } from 'react';
import type { LottoHistory } from '@/types';

export default function LottoPage(){
  const [picks, setPicks] = useState<number[]>([]);
  const [amount, setAmount] = useState(20);
  const [hist, setHist] = useState<LottoHistory['items']>([]);

  const toggle = (n:number) => setPicks(p=> p.includes(n) ? p.filter(x=>x!==n) : p.length<6 ? [...p,n] : p );
  const bet = () => fetch('/api/casino/lotto/bet', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ picks, special: null, amount }) })
    .then(r=>r.json()).then(()=>load());
  const load = () => fetch('/api/casino/lotto/history', { credentials:'include' }).then(r=>r.json()).then(d=>setHist(d.items||[]));

  useEffect(()=>{ load(); },[]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">樂透 6/49</h1>
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-10 gap-2">
          {Array.from({length:49},(_,i)=>i+1).map(n=> (
            <button key={n} className={`btn ${picks.includes(n)?'bg-white/20':''}`} onClick={()=>toggle(n)}>{n}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input className="input max-w-40" type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0'))}/>
          <button className="btn" onClick={bet} disabled={picks.length!==6}>下單（需 6 號）</button>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">近期開獎</h3>
        <ul className="space-y-2">
          {hist.map(d=> (
            <li key={d.id} className="flex items-center gap-4">
              <span className="w-24 opacity-70">#{d.code}</span>
              <span className="flex gap-2">{d.numbers?.map(n=> <span key={n} className="px-2 py-1 bg-white/10 rounded">{n}</span>)}</span>
              {d.special && <span className="ml-2 px-2 py-1 bg-amber-500/30 rounded">★ {d.special}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}