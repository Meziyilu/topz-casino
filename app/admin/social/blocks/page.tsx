'use client';

import { useState } from 'react';

export default function AdminBlocksPage() {
  const [blockerId, setBlockerId] = useState('');
  const [blockedId, setBlockedId] = useState('');
  const [level, setLevel] = useState('ALL');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  async function block() {
    const r = await fetch('/api/admin/social/blocks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blockerId, blockedId, level, reason }),
    });
    const d = await r.json();
    setMsg(r.ok ? '已封鎖' : `失敗：${d.error || 'ERROR'}`);
  }
  async function unblock() {
    const url = `/api/admin/social/blocks?blockerId=${encodeURIComponent(blockerId)}&blockedId=${encodeURIComponent(blockedId)}`;
    const r = await fetch(url, { method: 'DELETE' });
    const d = await r.json();
    setMsg(r.ok ? '已解除封鎖' : `失敗：${d.error || 'ERROR'}`);
  }

  return (
    <main className="s-col s-gap-12">
      <h1 className="s-card-title">封鎖 / 檢舉</h1>
      <div className="s-card s-col s-gap-10">
        <input className="s-input" placeholder="blockerId" value={blockerId} onChange={e => setBlockerId(e.target.value)} />
        <input className="s-input" placeholder="blockedId" value={blockedId} onChange={e => setBlockedId(e.target.value)} />
        <select className="s-select" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="CHAT_ONLY">CHAT_ONLY</option>
          <option value="DM_ONLY">DM_ONLY</option>
          <option value="ALL">ALL</option>
        </select>
        <input className="s-input" placeholder="原因（可空）" value={reason} onChange={e => setReason(e.target.value)} />
        <div className="s-flex s-gap-10">
          <button className="s-btn danger" onClick={block} data-sound>封鎖</button>
          <button className="s-btn ghost" onClick={unblock} data-sound>解除封鎖</button>
        </div>
        {msg && <div className="s-card-subtitle">{msg}</div>}
      </div>
    </main>
  );
}
