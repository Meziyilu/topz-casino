'use client';

import { useState } from 'react';

export default function AdminNotifyPage() {
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  async function submit() {
    const r = await fetch('/api/admin/social/notifications', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, title, body }),
    });
    const d = await r.json();
    setMsg(r.ok ? '已建立' : `失敗：${d.error || 'ERROR'}`);
  }

  return (
    <main className="s-col s-gap-12">
      <h1 className="s-card-title">站內通知</h1>
      <div className="s-card s-col s-gap-10">
        <input className="s-input" placeholder="userId" value={userId} onChange={e => setUserId(e.target.value)} />
        <input className="s-input" placeholder="標題" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="s-textarea" placeholder="內容" value={body} onChange={e => setBody(e.target.value)} />
        <button className="s-btn primary" onClick={submit} data-sound>送出</button>
        {msg && <div className="s-card-subtitle">{msg}</div>}
      </div>
    </main>
  );
}
