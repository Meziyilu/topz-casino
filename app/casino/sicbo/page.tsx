'use client';
import { useEffect, useState } from 'react';
import type { SicboState } from '@/types';

export default function SicboPage(){
  const [room, setRoom] = useState<'SB_R30'|'SB_R60'|'SB_R90'>('SB_R30');
  const [amount, setAmount] = useState(50);
  const [kind, setKind] = useState('BIG');
  const [s, setS] = useState<SicboState|null>(null);
  const load = () => fetch(`/api/casino/sicbo/state?room=${room}`, { credentials:'include' }).then(r=>r.json()).then(setS);
  useEffect(()=>{ load(); },[room]);

  const bet = () => fetch('/api/casino/sicbo/bet', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ room, kind, amount }) })
    .then(r=>r.json()).then(()=>load());

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">骰寶</h1>
      <div className="card p-4 flex gap-2 items-center">
        <select className="input max-w-40" value={room} onChange={e=>setRoom(e.target.value as any)}>
          <option>SB_R30</option><option>SB_R60</option><option>SB_R90</option>
        </select>
        <select className="input max-w-40" value={kind} onChange={e=>setKind(e.target.value)}>
          <option>BIG</option><option>SMALL</option><option>ODD</option><option>EVEN</option><option>ANY_TRIPLE</option>
        </select>
        <input className="input max-w-40" type="number" value={amount} onChange={e=>setAmount(parseInt(e.target.value||'0'))}/>
        <button className="btn" onClick={bet}>下注</button>
      </div>
      <div className="card p-4">
        <h3 className="font-semibold mb-2">目前</h3>
        <pre className="opacity-80 text-sm overflow-auto">{JSON.stringify(s?.current, null, 2)}</pre>
      </div>
      <div className="card p-4">
        <h3 className="font-semibold mb-2">歷史</h3>
        <pre className="opacity-80 text-sm overflow-auto">{JSON.stringify(s?.history?.slice(0,10), null, 2)}</pre>
      </div>
    </div>
  );
}