'use client';
import { useEffect, useState } from 'react';

type Row = { gameCode: 'ROULETTE'; key: string; valueInt: number | null };

export default function AdminRouletteConfig() {
  const [rows, setRows] = useState<Row[]>([]);
  const [key, setKey] = useState('RL_R30_DRAW_INTERVAL_SEC');
  const [valueInt, setValueInt] = useState<number>(30);

  async function pull() {
    const r = await fetch('/api/casino/roulette/admin/config', { cache: 'no-store' });
    setRows(await r.json());
  }
  useEffect(()=>{ pull(); }, []);

  async function save() {
    const r = await fetch('/api/casino/roulette/admin/config', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ key, valueInt }),
    });
    const j = await r.json();
    if (r.ok) { alert('Saved'); pull(); }
    else alert(j.error || 'CFG_FAIL');
  }

  return (
    <div style={{padding:20}}>
      <h1>Admin • Roulette Config</h1>
      <div style={{display:'flex', gap:8}}>
        <select value={key} onChange={e=>setKey(e.target.value)}>
          <option>RL_R30_DRAW_INTERVAL_SEC</option>
          <option>RL_R60_DRAW_INTERVAL_SEC</option>
          <option>RL_R90_DRAW_INTERVAL_SEC</option>
          <option>RL_LOCK_BEFORE_REVEAL_SEC</option>
          <option>RL_REVEAL_WINDOW_SEC</option>
        </select>
        <input type="number" value={valueInt} onChange={e=>setValueInt(parseInt(e.target.value||'0',10))}/>
        <button onClick={save}>儲存</button>
      </div>

      <h3 style={{marginTop:20}}>現有設定</h3>
      <ul>
        {rows.map(r=>(
          <li key={r.key}>{r.key}: {r.valueInt ?? '-'}</li>
        ))}
      </ul>
    </div>
  );
}
