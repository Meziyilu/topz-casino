'use client';

import { useState } from 'react';

export default function AdminDmBroadcastPage() {
  const [ids, setIds] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');

  async function submit() {
    setSending(true);
    setResult('');
    try {
      const userIds = ids.split(',').map(s => s.trim()).filter(Boolean);
      const r = await fetch('/api/admin/social/dm/broadcast', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds, body }),
      });
      const d = await r.json();
      setResult(r.ok ? `已送出：${d.count} 位` : `失敗：${d.error || 'ERROR'}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="s-col s-gap-12">
      <h1 className="s-card-title">私訊系統訊息</h1>
      <div className="s-card s-col s-gap-10">
        <input className="s-input" placeholder="userId（逗號分隔，不填表示全體）" value={ids} onChange={e => setIds(e.target.value)} />
        <textarea className="s-textarea" placeholder="訊息內容…" value={body} onChange={e => setBody(e.target.value)} />
        <div className="s-flex s-gap-10">
          <button className="s-btn primary" onClick={submit} disabled={sending || !body.trim()} data-sound>發送</button>
        </div>
        {result && <div className="s-card-subtitle">{result}</div>}
      </div>
    </main>
  );
}
