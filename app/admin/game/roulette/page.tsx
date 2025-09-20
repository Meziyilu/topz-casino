'use client';
import { useEffect, useState } from 'react';

type Row = { id: string; result: number | null; startedAt: string; endedAt: string | null };

export default function AdminRoulette() {
  const [room, setRoom] = useState<'RL_R30'|'RL_R60'|'RL_R90'>('RL_R30');
  const [history, setHistory] = useState<Row[]>([]);
  const [roundId, setRoundId] = useState('');
  const [forced, setForced] = useState<number | ''>('');

  async function pull() {
    const r = await fetch(`/api/casino/roulette/history?room=${room}&limit=30`, { cache: 'no-store' });
    setHistory(await r.json());
  }
  useEffect(()=>{ pull(); }, [room]);

  async function openRound() {
    const r = await fetch('/api/casino/roulette/admin/open', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ room }),
    });
    const j = await r.json();
    if (r.ok) { alert('開新局: '+j.roundId); setRoundId(j.roundId); pull(); }
    else alert(j.error || 'OPEN_FAIL');
  }

  async function settle() {
    if (!roundId) return alert('請輸入 roundId');
    const body: any = { roundId };
    if (forced !== '') body.result = Number(forced);
    const r = await fetch('/api/casino/roulette/admin/settle', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (r.ok) { alert('結算完成 result=' + j.result); pull(); }
    else alert(j.error || 'SETTLE_FAIL');
  }

  return (
    <div style={{padding:20}}>
      <h1>Admin • Roulette</h1>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <select value={room} onChange={e=>setRoom(e.target.value as any)}>
          <option>RL_R30</option><option>RL_R60</option><option>RL_R90</option>
        </select>
        <button onClick={openRound}>開新局</button>
        <input placeholder="roundId" value={roundId} onChange={e=>setRoundId(e.target.value)} style={{width:320}}/>
        <input type="number" placeholder="forced 0-36" value={forced} onChange={e=>setForced(e.target.value as any)} />
        <button onClick={settle}>結算</button>
      </div>

      <h3 style={{marginTop:20}}>最近 30 局</h3>
      <table>
        <thead><tr><th>ID</th><th>Result</th><th>Start</th><th>End</th></tr></thead>
        <tbody>
          {history.map(h=>(
            <tr key={h.id}>
              <td>{h.id.slice(0,10)}</td>
              <td>{h.result ?? '-'}</td>
              <td>{new Date(h.startedAt).toLocaleString()}</td>
              <td>{h.endedAt ? new Date(h.endedAt).toLocaleString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
